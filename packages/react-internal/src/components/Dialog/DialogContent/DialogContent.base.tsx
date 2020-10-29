import * as React from 'react';
import { classNamesFunction, css } from '../../../Utilities';
import { DialogType, IDialogContentProps, IDialogContentStyleProps, IDialogContentStyles } from './DialogContent.types';
import { IconButton } from '../../../compat/Button';
import { DialogFooter } from '../DialogFooter/DialogFooter';
import { IDialogFooterProps } from '../DialogFooter/DialogFooter.types';
import { useWarnings } from '@fluentui/react-hooks';

const getClassNames = classNamesFunction<IDialogContentStyleProps, IDialogContentStyles>();

const DialogFooterType = ((<DialogFooter />) as React.ReactElement<IDialogFooterProps>).type;

export const DialogContentBase: React.FunctionComponent<IDialogContentProps> = React.forwardRef<
  HTMLDivElement,
  IDialogContentProps
>((props, forwardedRef) => {
  const {
    showCloseButton = false,
    className = '',
    closeButtonAriaLabel = 'Close',
    onDismiss,
    subTextId,
    subText,
    titleProps = {},
    // eslint-disable-next-line deprecation/deprecation
    titleId,
    title,
    type,
    styles,
    theme,
    topButtonsProps = [],
    draggableHeaderClassName,
  } = props;

  const classNames = getClassNames(styles!, {
    theme: theme!,
    className,
    isLargeHeader: type === DialogType.largeHeader,
    isClose: type === DialogType.close,
    draggableHeaderClassName,
  });

  // @TODO - typing the footers as an array of DialogFooter is difficult because
  // casing "child as DialogFooter" causes a problem because
  // "Neither type 'ReactElement<any>' nor type 'DialogFooter' is assignable to the other."
  const groupChildren = (): { footers: any[]; contents: any[] } => {
    const groups: { footers: any[]; contents: any[] } = {
      footers: [],
      contents: [],
    };

    React.Children.map(props.children, child => {
      if (typeof child === 'object' && child !== null && (child as any).type === DialogFooterType) {
        groups.footers.push(child);
      } else {
        groups.contents.push(child);
      }
    });

    return groups;
  };

  const groupings = groupChildren();

  useDebugWarnings(props);

  return (
    <div className={classNames.content} ref={forwardedRef}>
      <div className={classNames.header}>
        <div
          id={titleId}
          role="heading"
          aria-level={1}
          {...titleProps}
          className={css(classNames.title, titleProps.className)}
        >
          {title}
        </div>
        <div className={classNames.topButton}>
          {topButtonsProps!.map((buttonProps, index) => (
            <IconButton key={buttonProps.uniqueId || index} {...buttonProps} />
          ))}
          {(type === DialogType.close || (showCloseButton && type !== DialogType.largeHeader)) && (
            <IconButton
              className={classNames.button}
              iconProps={{ iconName: 'Cancel' }}
              ariaLabel={closeButtonAriaLabel}
              onClick={onDismiss as any}
              title={closeButtonAriaLabel}
            />
          )}
        </div>
      </div>
      <div className={classNames.inner}>
        <div className={classNames.innerContent}>
          {subText && (
            <p className={classNames.subText} id={subTextId}>
              {subText}
            </p>
          )}
          {groupings.contents}
        </div>
        {groupings.footers}
      </div>
    </div>
  );
});
DialogContentBase.displayName = 'DialogContent';

function useDebugWarnings(props: IDialogContentProps) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- build-time conditional
    useWarnings({
      name: 'DialogContent',
      props,
      deprecations: {
        titleId: 'titleProps.id',
      },
    });
  }
}
