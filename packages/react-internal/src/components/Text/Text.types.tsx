import * as React from 'react';
import { ISlotProp, IComponent } from '@fluentui/foundation-legacy';
import { IFontStyles, IStyle, ITheme } from '../../Styling';

/**
 * {@docCategory Text}
 */
export type ITextComponent = IComponent<ITextProps, ITextTokens, ITextStyles>;

// The following two types are redundant with ITextComponent but are needed until TS function return widening issue
// is resolved: https://github.com/Microsoft/TypeScript/issues/241
// For now, these helper types can be used to provide return type safety when specifying tokens and styles functions.

/**
 * {@docCategory Text}
 */
export type ITextTokenReturnType = ReturnType<Extract<ITextComponent['tokens'], Function>>;

/**
 * {@docCategory Text}
 */
export type ITextStylesReturnType = ReturnType<Extract<ITextComponent['styles'], Function>>;

/**
 * {@docCategory Text}
 */
export type ITextSlot = ISlotProp<ITextProps, string>;

/**
 * {@docCategory Text}
 */
// export interface ITextSlots {
//   root?: IHTMLSlot;
// }

// export interface ITooltipHostProps extends React.HTMLAttributes<HTMLDivElement | TooltipHostBase> {

/**
 * Inputs to the component
 * {@docCategory Text}
 */
export interface ITextProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optionally render the component as another component type or primitive.
   */
  as?: React.ElementType<React.HTMLAttributes<HTMLElement>>;

  /**
   * Optional font type for Text.
   */
  variant?: keyof IFontStyles;

  /**
   * Whether the text is displayed as a block element.
   *
   * Note that in order for ellipsis on overflow to work properly,
   * `block` and `nowrap` should be set to true.
   */
  block?: boolean;

  /**
   * Whether the text is not wrapped.
   *
   * Note that in order for ellipsis on overflow to work properly,
   * `block` and `nowrap` should be set to true.
   */
  nowrap?: boolean;
}

// /**
//  * {@docCategory Text}
//  */
export interface ITextTokens {}

/**
 * {@docCategory Text}
 */
export interface ITextStyleProps {
  theme: ITheme;
  className?: string;
}

/**
 * {@docCategory Text}
 */
export interface ITextStyles {
  /**
   * Style for root element.
   */
  root: IStyle;
}
