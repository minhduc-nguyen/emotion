// @flow
import type { RegisteredCache, EmotionCache, SerializedStyles } from './types'

export const isBrowser = typeof document !== 'undefined'

export function getRegisteredStyles(
  registered: RegisteredCache,
  registeredStyles: string[],
  classNames: string
) {
  let rawClassName = ''

  classNames.split(' ').forEach(className => {
    if (registered[className] !== undefined) {
      registeredStyles.push(registered[className])
    } else {
      rawClassName += `${className} `
    }
  })
  return rawClassName
}

export const insertStyles = (
  cache: EmotionCache,
  serialized: SerializedStyles,
  isStringTag: boolean
) => {
  let className = `${cache.key}-${serialized.name}`
  if (
    // we only need to add the styles to the registered cache if the
    // class name could be used further down
    // the tree but if it's a string tag, we know it won't
    // so we don't have to add it to registered cache.
    // this improves memory usage since we can avoid storing the whole style string
    (isStringTag === false ||
      // we need to always store it if we're in compat mode and
      // in node since emotion-server relies on whether a style is in
      // the registered cache to know whether a style is global or not
      // also, note that this check will be dead code eliminated in the browser
      (isBrowser === false && cache.compat !== undefined)) &&
    cache.registered[className] === undefined
  ) {
    cache.registered[className] = serialized.styles
  }
  if (cache.inserted[serialized.name] === undefined) {
    // the inserting
    let next = serialized.next
    let dependencyStylesForSSR = ''
    if (next !== undefined) {
      // keyframes are dependencies of the style so they're
      // stored on the style as a singly linked list
      // they're stored seperately to the base styles
      // so that they can be cached seperately
      // if the keyframe is used multiple times
      // since the next property
      if (isBrowser) {
        insertStyles(cache, next, true)
      } else {
        let result = insertStyles(cache, next, true)
        if (result !== undefined) {
          dependencyStylesForSSR = result
        }
      }
    }
    let rules = cache.stylis(`.${className}`, serialized.styles)
    cache.inserted[serialized.name] = true

    if (process.env.NODE_ENV !== 'production' && serialized.map !== undefined) {
      for (let i = 0; i < rules.length; i++) {
        rules[i] += serialized.map
      }
    }

    if (isBrowser) {
      rules.forEach(cache.sheet.insert, cache.sheet)
    } else {
      let joinedRules = rules.join('')
      if (cache.compat === undefined) {
        // in regular mode, we don't set the styles on the inserted cache
        // since we don't need to and that would be wasting memory
        // we return them so that they are rendered in a style tag
        return dependencyStylesForSSR + joinedRules
      } else {
        // in compat mode, we put the styles on the inserted cache so
        // that emotion-server can pull out the styles
        cache.inserted[serialized.name] = joinedRules
      }
    }
  }
}

export * from './types'