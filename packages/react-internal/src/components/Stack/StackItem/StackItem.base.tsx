import * as React from 'react';
import { classNamesFunction } from '../../../Utilities';
import { IStackItemStyleProps, IStackItemProps, IStackItemStyles } from './StackItem.types';

const getClassNames = classNamesFunction<IStackItemStyleProps, IStackItemStyles>();

export const StackItemBase: React.FunctionComponent<IStackItemProps> = React.forwardRef<
  HTMLDivElement,
  IStackItemProps
>((props, forwardedRef) => {
  const { children, styles, theme, className, grow, shrink, disableShrink, align, verticalFill, order } = props;

  const classNames = getClassNames(styles!, {
    theme: theme!,
    className,
    grow,
    shrink,
    disableShrink,
    align,
    verticalFill,
    order,
  });

  return (
    (React.Children.count(children) > 1 && (
      <div className={classNames.root} ref={forwardedRef}>
        {children}
      </div>
    )) ||
    null
  );
});
StackItemBase.displayName = 'StackItem';
