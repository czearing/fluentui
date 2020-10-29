import * as React from 'react';
import { classNamesFunction } from '../../Utilities';
import { IDialogProps, IDialogStyleProps, IDialogStyles } from './Dialog.types';
import { DialogType, IDialogContentProps } from './DialogContent/DialogContent.types';
import { DialogContent } from './DialogContent/DialogContent';
import { Modal, IModalProps, IDragOptions } from '../../Modal';
import { ILayerProps } from '../../Layer';
import { ResponsiveMode } from '../../utilities/decorators/withResponsiveMode';
import { useId, useConst, useWarnings } from '@fluentui/react-hooks';

const getClassNames = classNamesFunction<IDialogStyleProps, IDialogStyles>();

const DefaultModalProps: IModalProps = {
  isDarkOverlay: false,
  isBlocking: false,
  className: '',
  containerClassName: '',
  topOffsetFixed: false,
};

const DefaultDialogContentProps: IDialogContentProps = {
  type: DialogType.normal,
  className: '',
  topButtonsProps: [],
};

interface IDialogInternalState {
  dialogDraggableClassName: string | undefined;
  dragOptions: IDragOptions | undefined;
}

export const DialogBase: React.FunctionComponent<IDialogProps> = React.forwardRef<HTMLDivElement, IDialogProps>(
  (props, forwardedRef) => {
    const dialogId = useId('Dialog');
    const defaultTitleTextId = dialogId + '-title';
    const defaultSubTextId = dialogId + '-subText';

    const internalState = useConst<IDialogInternalState>(() => ({
      dialogDraggableClassName: undefined,
      dragOptions: undefined,
    }));

    const {
      /* eslint-disable deprecation/deprecation */
      className,
      containerClassName,
      contentClassName,
      elementToFocusOnDismiss,
      firstFocusableSelector,
      forceFocusInsideTrap,
      children,
      styles,
      hidden = true,
      ignoreExternalFocusing,
      isBlocking,
      isClickableOutsideFocusTrap,
      isDarkOverlay,
      isOpen,
      onDismiss,
      onDismissed,
      onLayerDidMount,
      subText,
      theme,
      topButtonsProps,
      minWidth,
      maxWidth,
      modalProps,
      ariaDescribedById,
      ariaLabelledById,
      responsiveMode = ResponsiveMode.small,
      /* eslint-enable deprecation/deprecation */
    } = props;

    const mergedLayerProps: ILayerProps = {
      ...(modalProps ? modalProps.layerProps : { onLayerDidMount }),
    };

    if (onLayerDidMount && !mergedLayerProps.onLayerDidMount) {
      mergedLayerProps.onLayerDidMount = onLayerDidMount;
    }

    // if we are draggable, make sure we are using the correct
    // draggable classname and selectors
    if (modalProps && modalProps.dragOptions && !modalProps.dragOptions.dragHandleSelector) {
      internalState.dialogDraggableClassName = 'ms-Dialog-draggable-header';
      internalState.dragOptions = {
        ...modalProps.dragOptions,
        dragHandleSelector: `.${internalState.dialogDraggableClassName}`,
      };
    } else {
      internalState.dragOptions = modalProps && modalProps.dragOptions;
    }

    const mergedModalProps = {
      ...DefaultModalProps,
      className,
      containerClassName,
      isBlocking,
      isDarkOverlay,
      onDismissed,
      ...modalProps,
      layerProps: mergedLayerProps,
      dragOptions: internalState.dragOptions,
    };

    const dialogContentProps: IDialogContentProps = {
      className: contentClassName,
      subText,
      topButtonsProps,
      ...DefaultDialogContentProps,
      ...props.dialogContentProps,
      draggableHeaderClassName: internalState.dialogDraggableClassName,
      titleProps: {
        id: props.dialogContentProps?.titleId || defaultTitleTextId,
        ...props.dialogContentProps?.titleProps,
      },
    };

    const classNames = getClassNames(styles!, {
      theme: theme!,
      className: mergedModalProps.className,
      containerClassName: mergedModalProps.containerClassName,
      hidden,
      dialogDefaultMinWidth: minWidth,
      dialogDefaultMaxWidth: maxWidth,
    });

    const getSubTextId = (): string | undefined => {
      let id = (modalProps && modalProps.subtitleAriaId) || ariaDescribedById;
      if (!id) {
        id = ((dialogContentProps && dialogContentProps.subText) || subText) && defaultSubTextId;
      }
      return id;
    };

    const getTitleTextId = (): string | undefined => {
      let id = (modalProps && modalProps.titleAriaId) || ariaLabelledById;
      if (!id) {
        id = dialogContentProps && dialogContentProps.title && defaultTitleTextId;
      }
      return id;
    };

    useDebugWarnings(props);

    return (
      <Modal
        elementToFocusOnDismiss={elementToFocusOnDismiss}
        firstFocusableSelector={firstFocusableSelector}
        forceFocusInsideTrap={forceFocusInsideTrap}
        ignoreExternalFocusing={ignoreExternalFocusing}
        isClickableOutsideFocusTrap={isClickableOutsideFocusTrap}
        onDismissed={mergedModalProps.onDismissed}
        responsiveMode={responsiveMode}
        {...mergedModalProps}
        ref={forwardedRef}
        isDarkOverlay={mergedModalProps.isDarkOverlay}
        isBlocking={mergedModalProps.isBlocking}
        isOpen={isOpen !== undefined ? isOpen : !hidden}
        className={classNames.root}
        containerClassName={classNames.main}
        onDismiss={onDismiss ? onDismiss : mergedModalProps.onDismiss}
        subtitleAriaId={getSubTextId()}
        titleAriaId={getTitleTextId()}
      >
        <DialogContent
          subTextId={defaultSubTextId}
          title={dialogContentProps.title}
          subText={dialogContentProps.subText}
          showCloseButton={mergedModalProps.isBlocking}
          topButtonsProps={dialogContentProps.topButtonsProps}
          type={dialogContentProps.type}
          onDismiss={onDismiss ? onDismiss : dialogContentProps.onDismiss}
          className={dialogContentProps.className}
          {...dialogContentProps}
        >
          {children}
        </DialogContent>
      </Modal>
    );
  },
);
DialogBase.displayName = 'Dialog';

function useDebugWarnings(props: IDialogProps) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- build-time conditional
    useWarnings({
      name: 'Dialog',
      props,
      deprecations: {
        isOpen: 'hidden',
        subText: 'dialogContentProps.subText',
        contentClassName: 'dialogContentProps.className',
        topButtonsProps: 'dialogContentProps.topButtonsProps',
        className: 'modalProps.className',
        isDarkOverlay: 'modalProps.isDarkOverlay',
        isBlocking: 'modalProps.isBlocking',
        containerClassName: 'modalProps.containerClassName',
        onDismissed: 'modalProps.onDismissed',
        onLayerDidMount: 'modalProps.layerProps.onLayerDidMount',
        ariaDescribedById: 'modalProps.subtitleAriaId',
        ariaLabelledById: 'modalProps.titleAriaId',
      },
    });
  }
}
