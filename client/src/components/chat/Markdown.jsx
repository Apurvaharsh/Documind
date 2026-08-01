import { Children, cloneElement } from 'react'

/**
 * A small markdown renderer for generated answers.
 *
 * Written rather than installed for three reasons:
 *
 * 1. Safety. It emits React elements, never HTML strings, so there is no
 *    `dangerouslySetInnerHTML` anywhere and no sanitiser to keep current.
 *    Raw HTML in a model's output renders as visible text, which is the
 *    correct and safe outcome.
 * 2. Streaming. Answers arrive a token at a time, so the parser is handed
 *    half-written markdown on nearly every frame — an unclosed `**`, a fence
 *    with no end. Every rule here degrades to literal text instead of
 *    swallowing the rest of the document.
 * 3. Scope. A model answering from a PDF emits paragraphs, lists, emphasis,
 *    the occasional table and fence. That is a couple of hundred lines, not a
 *    dependency.
 *
 * Styling lives in the `.prose` block in index.css.
 */

/* Only these schemes are ever turned into a real link. Anything else — most
   importantly `javascript:` — falls through and renders as plain text. */
const SAFE_SCHEME = /^(https?:\/\/|mailto:)/i

/* Ordered by precedence. Code wins over everything so that `**` inside a code
   span stays literal; links resolve before emphasis so an underscore in a URL
   cannot open an <em>. */
const INLINE = new RegExp(
  [
    '(`+)([\\s\\S]*?)\\1', // 1,2  inline code
    '\\[([^\\]]+)\\]\\(([^()\\s]+)\\)', // 3,4  link
    '\\*\\*([\\s\\S]+?)\\*\\*', // 5    bold
    '__([\\s\\S]+?)__', // 6    bold
    '~~([\\s\\S]+?)~~', // 7    strikethrough
    '\\*([^*\\n]+?)\\*', // 8    italic
    '(?<![A-Za-z0-9])_([^_\\n]+?)_(?![A-Za-z0-9])', // 9 italic, but not snake_case
  ].join('|'),
  'g'
)

/**
 * Inline spans within a single block of text.
 *
 * Iterated with matchAll rather than a while/exec loop. This function recurses
 * into the contents of every emphasis span, and exec() advances `lastIndex` on
 * the shared regex object — so a nested call would rewind the position its
 * caller was relying on and the outer loop would match the same span forever.
 * matchAll iterates a clone, which makes the recursion safe.
 */
function renderInline(text, keyPrefix = 'i') {
  const nodes = []
  let last = 0
  let index = 0

  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index))
    }

    const key = `${keyPrefix}-${index++}`
    const [, , code, linkText, href, boldStar, boldUnderscore, strike, italicStar, italicUnderscore] =
      match

    if (code !== undefined) {
      nodes.push(<code key={key}>{code.trim()}</code>)
    } else if (href !== undefined) {
      nodes.push(
        SAFE_SCHEME.test(href) ? (
          // noreferrer alongside noopener: the model chose this destination,
          // not the user, so it does not get the referring URL either.
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {linkText}
          </a>
        ) : (
          `[${linkText}](${href})`
        )
      )
    } else if (boldStar !== undefined || boldUnderscore !== undefined) {
      nodes.push(<strong key={key}>{renderInline(boldStar ?? boldUnderscore, key)}</strong>)
    } else if (strike !== undefined) {
      nodes.push(
        <span key={key} className="line-through opacity-70">
          {renderInline(strike, key)}
        </span>
      )
    } else {
      nodes.push(<em key={key}>{renderInline(italicStar ?? italicUnderscore, key)}</em>)
    }

    last = match.index + match[0].length
  }

  if (last < text.length) {
    nodes.push(text.slice(last))
  }

  return nodes
}

const BULLET = /^(\s*)[-*+]\s+(.*)$/
const NUMBERED = /^(\s*)\d+[.)]\s+(.*)$/
const HEADING = /^(#{1,6})\s+(.*)$/
const QUOTE = /^>\s?(.*)$/
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/
const TABLE_ROW = /^\s*\|(.+)\|\s*$/
const TABLE_DIVIDER = /^\s*\|[\s:|-]+\|\s*$/

function splitRow(line) {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

/**
 * Builds a nested list from consecutive item lines.
 *
 * Indent is measured against the shallowest item in the run rather than
 * assumed to be zero, so a list that is itself indented still nests correctly.
 */
function buildList(items, ordered, key) {
  const base = Math.min(...items.map((item) => item.indent))
  const List = ordered ? 'ol' : 'ul'
  const children = []
  let i = 0

  while (i < items.length) {
    const item = items[i]

    // Everything more deeply indented than this item belongs inside it.
    const nested = []
    let j = i + 1
    while (j < items.length && items[j].indent > item.indent) {
      nested.push(items[j])
      j += 1
    }

    children.push(
      <li key={`${key}-${i}`}>
        {renderInline(item.text, `${key}-${i}`)}
        {nested.length ? buildList(nested, nested[0].ordered, `${key}-${i}-n`) : null}
      </li>
    )

    i = j
  }

  return (
    <List key={key} className={base > 0 ? 'mt-1.5' : undefined}>
      {children}
    </List>
  )
}

/** Block-level parse. */
function renderBlocks(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // -- blank ------------------------------------------------------------
    if (!line.trim()) {
      i += 1
      continue
    }

    // -- fenced code ------------------------------------------------------
    const fence = line.match(/^\s*```(\w*)\s*$/)
    if (fence) {
      const body = []
      i += 1
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        body.push(lines[i])
        i += 1
      }
      // A missing closing fence is normal mid-stream: everything to the end of
      // what has arrived is the code block, and the next token extends it.
      i += 1
      blocks.push(
        <pre key={key++}>
          <code>{body.join('\n')}</code>
        </pre>
      )
      continue
    }

    // -- horizontal rule --------------------------------------------------
    if (RULE.test(line)) {
      blocks.push(<hr key={key++} />)
      i += 1
      continue
    }

    // -- heading ----------------------------------------------------------
    const heading = line.match(HEADING)
    if (heading) {
      const level = Math.min(heading[1].length, 3)
      const Tag = `h${level}`
      blocks.push(<Tag key={key}>{renderInline(heading[2], `h${key++}`)}</Tag>)
      i += 1
      continue
    }

    // -- table ------------------------------------------------------------
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const header = splitRow(line)
      i += 2
      const rows = []
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        rows.push(splitRow(lines[i]))
        i += 1
      }

      blocks.push(
        // Tables are the one block that can exceed the column, so it scrolls
        // inside its own box rather than widening the whole thread.
        <div key={key} className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {header.map((cell, index) => (
                  <th key={index}>{renderInline(cell, `th${key}-${index}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {header.map((_, cellIndex) => (
                    <td key={cellIndex}>
                      {renderInline(row[cellIndex] ?? '', `td${key}-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      key += 1
      continue
    }

    // -- blockquote -------------------------------------------------------
    if (QUOTE.test(line)) {
      const body = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        body.push(lines[i].match(QUOTE)[1])
        i += 1
      }
      blocks.push(<blockquote key={key}>{renderInline(body.join(' '), `q${key++}`)}</blockquote>)
      continue
    }

    // -- list -------------------------------------------------------------
    if (BULLET.test(line) || NUMBERED.test(line)) {
      const items = []
      const ordered = NUMBERED.test(line)

      while (i < lines.length) {
        const bullet = lines[i].match(BULLET)
        const numbered = lines[i].match(NUMBERED)

        if (bullet) {
          items.push({ indent: bullet[1].length, text: bullet[2], ordered: false })
        } else if (numbered) {
          items.push({ indent: numbered[1].length, text: numbered[2], ordered: true })
        } else if (lines[i].trim() && items.length && /^\s{2,}/.test(lines[i])) {
          // A wrapped continuation line belongs to the item above it.
          items[items.length - 1].text += ` ${lines[i].trim()}`
        } else {
          break
        }
        i += 1
      }

      blocks.push(buildList(items, ordered, `l${key++}`))
      continue
    }

    // -- paragraph --------------------------------------------------------
    const body = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !BULLET.test(lines[i]) &&
      !NUMBERED.test(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !QUOTE.test(lines[i]) &&
      !RULE.test(lines[i]) &&
      !/^\s*```/.test(lines[i])
    ) {
      body.push(lines[i])
      i += 1
    }

    blocks.push(<p key={key}>{renderInline(body.join('\n'), `p${key++}`)}</p>)
  }

  return blocks
}

/**
 * @param text     the markdown source
 * @param caret    append a blinking block caret — set while the answer is
 *                 still streaming, so the thread shows it is being written
 *                 rather than finished and short.
 */
function Markdown({ text = '', caret = false, className = '' }) {
  const blocks = renderBlocks(text)

  if (caret) {
    const cursor = (
      <span
        key="caret"
        aria-hidden="true"
        className="animate-caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] rounded-full bg-brand align-middle"
      />
    )

    // Tucked inside the final block rather than appended after it. As a
    // sibling it would sit on its own line below the text, which reads as a
    // stray mark instead of a cursor at the point of writing.
    const last = blocks[blocks.length - 1]
    if (last && (last.type === 'p' || last.type === 'li')) {
      blocks[blocks.length - 1] = cloneElement(last, undefined, [
        ...Children.toArray(last.props.children),
        cursor,
      ])
    } else {
      blocks.push(cursor)
    }
  }

  return <div className={`prose ${className}`}>{blocks}</div>
}

export default Markdown
