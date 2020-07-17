import { Accessibility } from '@fluentui/accessibility';
import {
  ComponentWithAs,
  getElementType,
  useUnhandledProps,
  useAccessibility,
  useStyles,
  useTelemetry,
  useFluentContext,
} from '@fluentui/react-bindings';
import * as React from 'react';

import { FluentComponentStaticProps } from '../../types';
import { ChildrenComponentProps, commonPropTypes, createShorthandFactory, UIComponentProps } from '../../utils';

export interface CardTopControlsProps extends UIComponentProps, ChildrenComponentProps {
  /**
   * Accessibility behavior if overridden by the user.
   */
  accessibility?: Accessibility<never>;
}

export type CardTopControlsStylesProps = never;
export const cardTopControlsClassName = 'ui-card__topcontrols';

/**
 * A CardTopControls is used to render control elements in the top of a Card component.
 */
export const CardTopControls: ComponentWithAs<'div', CardTopControlsProps> &
  FluentComponentStaticProps<CardTopControlsProps> = props => {
  const context = useFluentContext();
  const { setStart, setEnd } = useTelemetry(CardTopControls.displayName, context.telemetry);
  setStart();

  const { className, design, styles, variables, children } = props;
  const ElementType = getElementType(props);
  const unhandledProps = useUnhandledProps(CardTopControls.handledProps, props);
  const getA11yProps = useAccessibility(props.accessibility, {
    debugName: CardTopControls.displayName,
    rtl: context.rtl,
  });

  const { classes } = useStyles<CardTopControlsStylesProps>(CardTopControls.displayName, {
    className: cardTopControlsClassName,
    mapPropsToInlineStyles: () => ({
      className,
      design,
      styles,
      variables,
    }),
    rtl: context.rtl,
  });

  const element = (
    <ElementType
      {...getA11yProps('root', {
        className: classes.root,
        ...unhandledProps,
      })}
    >
      {children}
    </ElementType>
  );
  setEnd();
  return element;
};

CardTopControls.displayName = 'CardTopControls';

CardTopControls.propTypes = {
  ...commonPropTypes.createCommon(),
};

CardTopControls.handledProps = Object.keys(CardTopControls.propTypes) as any;

CardTopControls.create = createShorthandFactory({ Component: CardTopControls });
