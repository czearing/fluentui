import * as React from 'react';
import {
  classNamesFunction,
  allowScrollOnElement,
  allowOverscrollOnElement,
  KeyCodes,
  elementContains,
  EventGroup,
} from '../../Utilities';
import { FocusTrapZone, IFocusTrapZone } from 'office-ui-fabric-react/src/components/FocusTrapZone/index';
import { animationDuration } from './Modal.styles';
import { IModalProps, IModalStyleProps, IModalStyles } from './Modal.types';
import { Overlay } from '../../Overlay';
import { ILayerProps, Layer } from '../../Layer';
import { Popup } from '../Popup/index';
import { ResponsiveMode } from 'office-ui-fabric-react/lib/utilities/decorators/withResponsiveMode';
import { DirectionalHint } from 'office-ui-fabric-react/src/components/Callout/index';
import { Icon } from 'office-ui-fabric-react/src/components/Icon/index';
import { DraggableZone, IDragData } from 'office-ui-fabric-react/lib/utilities/DraggableZone/index';
import { useSetTimeout, useResponsiveMode, useBoolean, useConstCallback, useConst } from '@uifabric/react-hooks';

// @TODO - need to change this to a panel whenever the breakpoint is under medium (verify the spec)

const DefaultLayerProps: ILayerProps = {
  eventBubblingEnabled: false,
};

export interface IModalInternalState {
  responsiveModes: ResponsiveMode | undefined;
  onModalCloseTimer: number;
  scrollableContent: HTMLDivElement | null;
  lastSetX: number;
  lastSetY: number;
  allowTouchBodyScrollValue: boolean;
  hasRegisteredKeyUp: boolean;
  events: EventGroup;
}

const useComponentRef = (props: IModalProps, focusTrapZone: React.RefObject<IFocusTrapZone>) => {
  React.useImperativeHandle(
    props.componentRef,
    () => ({
      focus() {
        if (focusTrapZone.current) {
          focusTrapZone.current.focus();
        }
      },
    }),
    [focusTrapZone],
  );
};

const getClassNames = classNamesFunction<IModalStyleProps, IModalStyles>();
const COMPONENT_NAME = 'Modal';

export const ModalBase = (props: React.PropsWithChildren<IModalProps>) => {
  const focusTrapZone = React.useRef<IFocusTrapZone>(null);

  // const id = useId('Modal')
  const [modalRectangleTop, setModalRectangleTop] = React.useState<number>();
  const [x, setX] = React.useState<number>(0);
  const [y, setY] = React.useState<number>(0);
  const {
    allowTouchBodyScroll = false,
    isOpen = false,
    className = '',
    containerClassName = '',
    scrollableContentClassName,
    elementToFocusOnDismiss,
    firstFocusableSelector,
    forceFocusInsideTrap,
    ignoreExternalFocusing,
    isBlocking = false,
    isClickableOutsideFocusTrap,
    isDarkOverlay = true,
    onDismiss,
    layerProps,
    overlay,
    responsiveMode,
    titleAriaId,
    styles,
    subtitleAriaId,
    theme,
    topOffsetFixed,
    // eslint-disable-next-line deprecation/deprecation
    onLayerDidMount,
    isModeless,
    dragOptions,
  } = props;

  const [isModalOpen, { toggle: toggleModalOpen, setFalse: setModalClose, setTrue: setModalOpen }] = useBoolean(
    !!props.isOpen,
  );
  const [isVisible, { setFalse: setIsVisibleFalse, setTrue: setIsVisibleTrue }] = useBoolean(!!props.isOpen);
  const [hasOpened, { setFalse: setHasOpenedFalse, setTrue: setHasOpenedTrue }] = useBoolean(!!props.isOpen);
  const [isInKeyboardMoveMode, { setFalse: setKeyboardMoveModeFalse, setTrue: setKeyboardMoveModeTrue }] = useBoolean(
    !!props.isOpen,
  );

  const internalState = useConst<IModalInternalState>(() => ({
    responsiveModes: undefined,
    onModalCloseTimer: 0,
    scrollableContent: null,
    lastSetX: 0,
    lastSetY: 0,
    allowTouchBodyScrollValue: allowTouchBodyScroll,
    hasRegisteredKeyUp: false,
    events: new EventGroup({}),
  }));

  const { setTimeout, clearTimeout } = useSetTimeout();

  const layerClassName = layerProps === undefined ? '' : layerProps.className;

  const classNames = getClassNames(styles, {
    theme: theme!,
    className,
    containerClassName,
    scrollableContentClassName,
    isOpen,
    isVisible,
    // hasBeenOpened,
    modalRectangleTop,
    topOffsetFixed,
    isModeless,
    layerClassName,
    isDefaultDragHandle: dragOptions && !dragOptions.dragHandleSelector,
  });

  const mergedLayerProps = {
    ...DefaultLayerProps,
    ...props.layerProps,
    onLayerDidMount: layerProps && layerProps.onLayerDidMount ? layerProps.onLayerDidMount : onLayerDidMount,
    insertFirst: isModeless,
    className: classNames.layer,
  };

  const allowScrollOnModal = useConstCallback((elt: HTMLDivElement | null): void => {
    if (elt) {
      if (internalState.allowTouchBodyScrollValue) {
        allowOverscrollOnElement(elt, internalState.events);
      } else {
        allowScrollOnElement(elt, internalState.events);
      }
    } else {
      internalState.events.off(internalState.scrollableContent);
    }
    internalState.scrollableContent = elt;
  });

  const onModalClose = (): void => {
    internalState.lastSetX = 0;
    internalState.lastSetY = 0;
    setModalClose();
    setHasOpenedFalse();
    setKeyboardMoveModeFalse();
    setX(0);
    setY(0);

    if (props.dragOptions && internalState.hasRegisteredKeyUp) {
      internalState.events.off(window, 'keyup', onKeyUp, true /* useCapture */);
    }

    // Call the onDismiss callback
    if (props.onDismissed) {
      props.onDismissed();
    }
  };

  const onDragStart = useConstCallback((): void => {
    setModalClose();
    setKeyboardMoveModeFalse();
  });

  const onDrag = useConstCallback(
    (ev: React.MouseEvent<HTMLElement> & React.TouchEvent<HTMLElement>, ui: IDragData): void => {
      setX(x + ui.delta.x);
      setY(y + ui.delta.y);
    },
  );

  const onDragStop = useConstCallback((): void => {
    focus();
  });

  const onKeyUp = (event: React.KeyboardEvent<HTMLElement>): void => {
    // Need to handle the CTRL + ALT + SPACE key during keyup due to FireFox bug:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1220143
    // Otherwise it would continue to fire a click even if the event was cancelled
    // during mouseDown.
    if (event.altKey && event.ctrlKey && event.keyCode === KeyCodes.space) {
      // Since this is a global handler, we should make sure the target is within the dialog
      // before opening the dropdown
      if (elementContains(internalState.scrollableContent, event.target as HTMLElement)) {
        toggleModalOpen();
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  // We need a global onKeyDown event when we are in the move mode so that we can
  // handle the key presses and the components inside the modal do not get the events
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.altKey && event.ctrlKey && event.keyCode === KeyCodes.space) {
      // CTRL + ALT + SPACE is handled during keyUp
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (isModalOpen && (event.altKey || event.keyCode === KeyCodes.escape)) {
      setModalClose();
    }

    if (isInKeyboardMoveMode && (event.keyCode === KeyCodes.escape || event.keyCode === KeyCodes.enter)) {
      setKeyboardMoveModeFalse();
      event.preventDefault();
      event.stopPropagation();
    }

    if (isInKeyboardMoveMode) {
      let handledEvent = true;
      const delta = getMoveDelta(event);

      switch (event.keyCode) {
        /* eslint-disable no-fallthrough */
        case KeyCodes.escape:
          setX(internalState.lastSetX);
          setY(internalState.lastSetY);
        case KeyCodes.enter: {
          // TODO: determine if fallthrough was intentional
          /* eslint-enable no-fallthrough */
          internalState.lastSetX = 0;
          internalState.lastSetY = 0;
          setKeyboardMoveModeFalse();
          break;
        }
        case KeyCodes.up: {
          setY(y - delta);
          break;
        }
        case KeyCodes.down: {
          setY(y + delta);
          break;
        }
        case KeyCodes.left: {
          setX(x - delta);
          break;
        }
        case KeyCodes.right: {
          setX(x + delta);
          break;
        }
        default: {
          handledEvent = false;
        }
      }

      if (handledEvent) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  const getMoveDelta = (event: React.KeyboardEvent<HTMLElement>): number => {
    let delta = 10;
    if (event.shiftKey) {
      if (!event.ctrlKey) {
        delta = 50;
      }
    } else if (event.ctrlKey) {
      delta = 1;
    }

    return delta;
  };

  const onEnterKeyboardMoveMode = () => {
    internalState.lastSetX = x;
    internalState.lastSetY = y;
    setKeyboardMoveModeTrue();
    setModalClose();
    internalState.events.on(window, 'keydown', onKeyDown, true /* useCapture */);
  };

  const onExitKeyboardMoveMode = () => {
    internalState.lastSetX = 0;
    internalState.lastSetY = 0;
    setKeyboardMoveModeFalse();
    internalState.events.off(window, 'keydown', onKeyDown, true /* useCapture */);
  };

  const registerForKeyUp = (): void => {
    if (!internalState.hasRegisteredKeyUp) {
      internalState.events.on(window, 'keyup', onKeyUp, true /* useCapture */);
      internalState.hasRegisteredKeyUp = true;
    }
  };

  const modalContent = (
    <FocusTrapZone
      componentRef={focusTrapZone}
      className={classNames.main}
      elementToFocusOnDismiss={elementToFocusOnDismiss}
      isClickableOutsideFocusTrap={isModeless || isClickableOutsideFocusTrap || !isBlocking}
      ignoreExternalFocusing={ignoreExternalFocusing}
      forceFocusInsideTrap={isModeless ? !isModeless : forceFocusInsideTrap}
      firstFocusableSelector={firstFocusableSelector}
      focusPreviouslyFocusedInnerElement={true}
      onBlur={isInKeyboardMoveMode ? onExitKeyboardMoveMode : undefined}
    >
      {dragOptions && isInKeyboardMoveMode && (
        <div className={classNames.keyboardMoveIconContainer}>
          {dragOptions.keyboardMoveIconProps ? (
            <Icon {...dragOptions.keyboardMoveIconProps} />
          ) : (
            <Icon iconName="move" className={classNames.keyboardMoveIcon} />
          )}
        </div>
      )}
      <div ref={allowScrollOnModal} className={classNames.scrollableContent} data-is-scrollable>
        {dragOptions && isModalOpen && (
          <dragOptions.menu
            items={[
              { key: 'move', text: dragOptions.moveMenuItemText, onClick: onEnterKeyboardMoveMode },
              { key: 'close', text: dragOptions.closeMenuItemText, onClick: onModalClose },
            ]}
            onDismiss={setModalClose}
            alignTargetEdge
            coverTarget
            directionalHint={DirectionalHint.topLeftEdge}
            directionalHintFixed
            shouldFocusOnMount
            target={internalState.scrollableContent}
          />
        )}
        {props.children}
      </div>
    </FocusTrapZone>
  );

  React.useEffect(() => {
    // Not all modals show just by updating their props. Some only render when they are mounted and pass in
    // isOpen as true. We need to add the keyUp handler in componentDidMount if we are in that case.
    if (isOpen && isVisible) {
      registerForKeyUp();
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen && !isVisible) {
      setIsVisibleTrue();
    }
  }, [isOpen]);

  React.useEffect(() => {
    clearTimeout(internalState.onModalCloseTimer);

    // Opening the dialog
    if (isOpen) {
      if (!isOpen) {
        // First Open
        setModalOpen();

        // Add a keyUp handler for all key up events when the dialog is open
        if (dragOptions) {
          registerForKeyUp();
        }
      } else {
        // Modal has been opened
        // Reopen during closing
        setHasOpenedTrue();
        setIsVisibleTrue();

        if (props.topOffsetFixed) {
          const dialogMain = document.getElementsByClassName('ms-Dialog-main');
          let modalRectangle;
          if (dialogMain.length > 0) {
            modalRectangle = dialogMain[0].getBoundingClientRect();
            setModalRectangleTop(modalRectangle.top);
          }
        }
      }
    }
    // Closing the dialog
    if (!props.isOpen && isOpen) {
      internalState.onModalCloseTimer = setTimeout(onModalClose, parseFloat(animationDuration) * 1000);
      setIsVisibleFalse;
    }
  }, [props, isOpen]);

  useComponentRef(props, focusTrapZone);

  // @temp tuatology - Will adjust this to be a panel at certain breakpoints
  if (useResponsiveMode! >= ResponsiveMode.small) {
    return (
      <Layer {...mergedLayerProps}>
        <Popup
          role={isModeless || !isBlocking ? 'dialog' : 'alertdialog'}
          aria-modal={!isModeless}
          ariaLabelledBy={titleAriaId}
          ariaDescribedBy={subtitleAriaId}
          onDismiss={onDismiss}
          shouldRestoreFocus={!ignoreExternalFocusing}
        >
          <div className={classNames.root}>
            {!isModeless && (
              <Overlay
                isDarkThemed={isDarkOverlay}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={isBlocking ? undefined : (onDismiss as any)}
                allowTouchBodyScroll={internalState.allowTouchBodyScrollValue}
                {...overlay}
              />
            )}
            {dragOptions ? (
              <DraggableZone
                handleSelector={dragOptions.dragHandleSelector || `.${classNames.main.split(' ')[0]}`}
                preventDragSelector="button"
                onStart={onDragStart}
                onDragChange={onDrag}
                onStop={onDragStop}
                position={{ x: x, y: y }}
              >
                {modalContent}
              </DraggableZone>
            ) : (
              modalContent
            )}
          </div>
        </Popup>
      </Layer>
    );
  }
};
ModalBase.displayName = COMPONENT_NAME;
ModalBase.DefaultLayerProps = {
  eventBubblingEnabled: false,
};
