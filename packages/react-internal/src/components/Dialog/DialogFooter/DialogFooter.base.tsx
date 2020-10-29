import * as React from 'react';
import { IDialogFooterProps, IDialogFooterStyleProps, IDialogFooterStyles } from './DialogFooter.types';
import { classNamesFunction } from '../../../Utilities';
import { IProcessedStyleSet } from '../../../Styling';

const getClassNames = classNamesFunction<IDialogFooterStyleProps, IDialogFooterStyles>();

export const DialogFooterBase: React.FunctionComponent<IDialogFooterProps> = React.forwardRef<
  HTMLDivElement,
  IDialogFooterProps
>((props, forwardedRef) => {
  const { className, styles, theme, children } = props;

  const classNames: IProcessedStyleSet<IDialogFooterStyles> = getClassNames(styles!, {
    theme: theme!,
    className,
  });

  const renderChildrenAsActions = (): (JSX.Element | null)[] | null | undefined => {
    return React.Children.map(children, child => (child ? <span className={classNames.action}>{child}</span> : null));
  };

  return (
    <div className={classNames.actions} ref={forwardedRef}>
      <div className={classNames.actionsRight}>{renderChildrenAsActions()}</div>
    </div>
  );
});
DialogFooterBase.displayName = 'DialogFooter';
