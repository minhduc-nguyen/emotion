import * as React from 'react'
import reactPrimitives from 'react-primitives'
import PropTypes from 'prop-types'

import { getStyles } from './getStyles'
import { convertToRNStyles, createStyles } from './convertToRNStyles'

const isValidPrimitive = primitive =>
  ['Text', 'View', 'Image'].indexOf(primitive) > -1

const getPrimitive = primitive => {
  if (typeof primitive === 'string' && isValidPrimitive(primitive)) {
    return reactPrimitives[primitive]
  } else if (typeof primitive === 'string' && !isValidPrimitive(primitive)) {
    throw new Error(
      `Cannot style invalid primitive ${primitive}. Expected primitive to be one of ['Text', 'View', 'Image']`
    )
  } else if (typeof primitive === 'function') {
    return primitive
  }
}

function evalStyles(context, Comp, styles, styleOverrides) {
  // Assign static property so that the styles can be reused (like in withComponent)
  Comp.styles = convertToRNStyles.call(context, styles)

  return getStyles.call(
    context,
    Comp.styles,
    context.props,
    styleOverrides
  )
}

/**
 * Creates a function that renders the styles on multiple targets with same code.
 */
export function createEmotionPrimitive(splitProps) {
  /* 
   * Returns styled component
   */
  return function emotion(primitive, { displayName } = {}) {
    return createStyledComponent

    /**
     * Create emotion styled component
     */
    function createStyledComponent() {
      let styles = []

      styles.push.apply(styles, arguments)

      class Styled extends React.Component {
        static propTypes = {
          innerRef: PropTypes.func
        }

        onRef = innerComponent => {
          this.innerComponent = innerComponent

          if (this.props.innerRef) {
            this.props.innerRef(innerComponent)
          }
        }

        render() {
          const { toForward, styleOverrides } = splitProps(
            primitive,
            this.props
          )

          const emotionStyles = evalStyles(this, Styled, styles, styleOverrides)

          return React.createElement(
            getPrimitive(primitive),
            {
              ...toForward,
              ref: this.onRef,
              style: emotionStyles.length > 0 ? emotionStyles : null
            },
            this.props.children || null
          )
        }
      }

      Styled.primitive = primitive

      Styled.withComponent = (newPrimitive, options = {}) =>
        emotion(reactPrimitives[newPrimitive], {
          ...options
        })(...Styled.styles)

      Object.assign(
        Styled,
        getStyledMetadata({
          primitive,
          styles,
          displayName
        })
      )

      return Styled
    }
  }
}

const getStyledMetadata = ({ primitive, styles, displayName }) => ({
  styles: primitive.styles ? primitive.styles.concat(styles) : styles,
  primitive: primitive.primitive ? primitive.primitive : primitive,
  displayName: displayName || `emotion(${getDisplayName(primitive)})`
})

const getDisplayName = primitive =>
  typeof primitive === 'string' ? primitive : primitive.displayName || 'Styled'