import * as React from 'react';
import { IStyle, ITheme } from '@fluentui/style-utilities';
import { IStyleFunctionOrObject } from '../../../Utilities';

/**
 * {@docCategory Stack}
 */
export interface IStackItemProps extends React.HTMLAttributes<HTMLElement>, React.RefAttributes<HTMLElement> {
  /**
   * Defines a CSS class name used to style the StackItem.
   */
  className?: string;

  /**
   * Defines how much to grow the StackItem in proportion to its siblings.
   */
  grow?: boolean | number | 'inherit' | 'initial' | 'unset';

  /**
   * Defines at what ratio should the StackItem shrink to fit the available space.
   */
  shrink?: boolean | number | 'inherit' | 'initial' | 'unset';

  /**
   * Defines whether the StackItem should be prevented from shrinking.
   * This can be used to prevent a StackItem from shrinking when it is inside of a Stack that has shrinking items.
   * @defaultvalue false
   */
  disableShrink?: boolean;

  /**
   * Defines how to align the StackItem along the x-axis (for vertical Stacks) or the y-axis (for horizontal Stacks).
   */
  align?: 'auto' | 'stretch' | 'baseline' | 'start' | 'center' | 'end';

  /**
   * Theme values.
   */
  theme?: ITheme;

  /**
   * Call to provide customized styling that will layer on top of the variant rules.
   */
  styles?: IStyleFunctionOrObject<IStackItemStyleProps, IStackItemStyles>;

  /**
   * Defines whether the StackItem should take up 100% of the height of its parent.
   * @defaultvalue true
   */
  verticalFill?: boolean;

  /**
   * Defines order of the StackItem.
   * @defaultvalue 0
   */
  order?: number | string;
}

/**
 * {@docCategory Stack}
 */

export type IStackItemStyleProps = Required<Pick<IStackItemProps, 'theme'>> &
  Pick<IStackItemProps, 'grow' | 'shrink' | 'disableShrink' | 'align' | 'verticalFill' | 'order'> & {
    /**
     * Root element class name.
     */
    className?: string;
    /**
     * Defines the margin to be applied to the StackItem relative to its container.
     */
    margin?: number | string;

    /**
     * Defines the padding to be applied to the StackItem contents relative to its border.
     */
    padding?: number | string;
    /**
     * Theme values.
     */
    theme?: ITheme;
  };

/**
 * {@docCategory Stack}
 */
export interface IStackItemStyles {
  root: IStyle;
}
