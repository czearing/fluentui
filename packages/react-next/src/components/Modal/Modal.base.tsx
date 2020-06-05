import * as React from 'react';
import {
  classNamesFunction,
  getId,
  allowScrollOnElement,
  allowOverscrollOnElement,
  KeyCodes,
  elementContains,
  warnDeprecations,
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
import { useSetTimeout } from '@uifabric/react-hooks';

// @TODO - need to change this to a panel whenever the breakpoint is under medium (verify the spec)

const DefaultLayerProps: ILayerProps = {
  eventBubblingEnabled: false,
};

export interface IDialogState {
  isOpen?: boolean;
  isVisible?: boolean;
  isVisibleClose?: boolean;
  id?: string;
  hasBeenOpened?: boolean;
  modalRectangleTop?: number;
  isModalMenuOpen?: boolean;
  isInKeyboardMoveMode?: boolean;
  x: number;
  y: number;
}

export interface IModalState {
  scrollableContent: HTMLDivElement | null;
  lastSetX: number;
  lastSetY: number;
  hasRegisteredKeyUp: boolean;
  onModalCloseTimer: number;
  prevProps: IModalProps;
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
  const [id, setId] = React.useState(getId('Modal'));
  const [isModalMenuOpen, setIsModalMenuOpen] = React.useState();
  const [isInKeyboardMoveMode, setIsInKeyboardMoveMode] = React.useState();
  const [modalRectangleTop, setModalRectangleTop] = React.useState();
  const [isOpen, setIsOpen] = React.useState(props.isOpen);
  const [isVisible, setIsVisible] = React.useState(props.isOpen);
  const [hasBeenOpened, setHasBeenOpened] = React.useState(props.isOpen);
  const [x, setX] = React.useState(0);
  const [y, setY] = React.useState(0);
  const events = new EventGroup(this);
  const { allowTouchBodyScroll = false } = props;

  const [state] = React.useState<IModalState>({
    scrollableContent: null,
    lastSetX: 0,
    lastSetY: 0,
    hasRegisteredKeyUp: false,
    onModalCloseTimer: 0,
    prevProps: props,
  });

  warnDeprecations(COMPONENT_NAME, props, {
    onLayerDidMount: 'layerProps.onLayerDidMount',
  });

  const {
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
    // tslint:disable-next-line:deprecation
    onLayerDidMount,
    isModeless,
    dragOptions,
  } = props;

  const layerClassName = layerProps === undefined ? '' : layerProps.className;

  const classNames = getClassNames(styles, {
    theme: theme!,
    className: '',
    containerClassName: '',
    scrollableContentClassName,
    isOpen: false,
    isVisible,
    hasBeenOpened,
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

  // Allow the user to scroll within the modal but not on the body
  const allowScrollOnModal = (elt: HTMLDivElement | null): void => {
    if (elt) {
      if (allowTouchBodyScroll) {
        allowOverscrollOnElement(elt, events);
      } else {
        allowScrollOnElement(elt, events);
      }
    } else {
      events.off(state.scrollableContent);
    }
    state.scrollableContent = elt;
  };

  const onModalContextMenuClose = (): void => {
    setIsModalMenuOpen(false);
  };

  const onModalClose = (): void => {
    state.lastSetX = 0;
    state.lastSetY = 0;
    setIsModalMenuOpen(false);
    setIsInKeyboardMoveMode(false);
    setIsOpen(false);
    setX(0);
    setY(0);

    if (props.dragOptions && state.hasRegisteredKeyUp) {
      events.off(window, 'keyup', onKeyUp, true /* useCapture */);
    }

    // Call the onDismiss callback
    if (props.onDismissed) {
      props.onDismissed();
    }
  };

  const onDragStart = (): void => {
    setIsModalMenuOpen(false);
    setIsInKeyboardMoveMode(false);
  };

  const onDrag = (_: React.MouseEvent<HTMLElement> & React.TouchEvent<HTMLElement>, ui: IDragData): void => {
    setX(x + ui.delta.x);
    setY(y + ui.delta.y);
  };

  const onDragStop = (): void => {
    if (focusTrapZone.current) {
      focusTrapZone.current.focus();
    }
  };

  const onKeyUp = (ev: React.KeyboardEvent<HTMLElement>): void => {
    // Need to handle the CTRL + ALT + SPACE key during keyup due to FireFox bug:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1220143
    // Otherwise it would continue to fire a click even if the event was cancelled
    // during mouseDown.
    if (ev.altKey && ev.ctrlKey && ev.keyCode === KeyCodes.space) {
      // Since this is a global handler, we should make sure the target is within the dialog
      // before opening the dropdown
      if (elementContains(state.scrollableContent, ev.target as HTMLElement)) {
        setIsModalMenuOpen(!isModalMenuOpen);
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  };

  // We need a global onKeyDown event when we are in the move mode so that we can
  // handle the key presses and the components inside the modal do not get the events
  const onKeyDown = (ev: React.KeyboardEvent<HTMLElement>): void => {
    if (ev.altKey && ev.ctrlKey && ev.keyCode === KeyCodes.space) {
      // CTRL + ALT + SPACE is handled during keyUp
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }

    if (isModalMenuOpen && (ev.altKey || ev.keyCode === KeyCodes.escape)) {
      setIsModalMenuOpen(false);
    }

    if (isInKeyboardMoveMode && (ev.keyCode === KeyCodes.escape || ev.keyCode === KeyCodes.enter)) {
      setIsInKeyboardMoveMode(false);
      ev.preventDefault();
      ev.stopPropagation();
    }

    if (isInKeyboardMoveMode) {
      let handledEvent = true;
      const delta = getMoveDelta(ev);

      switch (ev.keyCode) {
        case KeyCodes.escape:
          setX(state.lastSetX);
          setY(state.lastSetY);
        case KeyCodes.enter: {
          state.lastSetX = 0;
          state.lastSetY = 0;
          setIsInKeyboardMoveMode(false);
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
        ev.preventDefault();
        ev.stopPropagation();
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
    state.lastSetX = x;
    state.lastSetY = y;
    setIsInKeyboardMoveMode(true);
    setIsModalMenuOpen(false);
    events.on(window, 'keydown', onKeyDown, true /* useCapture */);
  };

  const onExitKeyboardMoveMode = () => {
    state.lastSetX = 0;
    state.lastSetY = 0;
    setIsInKeyboardMoveMode(false);
    events.off(window, 'keydown', onKeyDown, true /* useCapture */);
  };

  const registerForKeyUp = (): void => {
    if (!state.hasRegisteredKeyUp) {
      events.on(window, 'keyup', onKeyUp, true /* useCapture */);
      state.hasRegisteredKeyUp = true;
    }
  };

  const safeSetTimeout = useSetTimeout();

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
      <div ref={allowScrollOnModal} className={classNames.scrollableContent} data-is-scrollable={true}>
        {dragOptions && isModalMenuOpen && (
          <dragOptions.menu
            items={[
              { key: 'move', text: dragOptions.moveMenuItemText, onClick: onEnterKeyboardMoveMode },
              { key: 'close', text: dragOptions.closeMenuItemText, onClick: onModalClose },
            ]}
            onDismiss={onModalContextMenuClose}
            alignTargetEdge={true}
            coverTarget={true}
            directionalHint={DirectionalHint.topLeftEdge}
            directionalHintFixed={true}
            shouldFocusOnMount={true}
            target={state.scrollableContent}
          />
        )}
        {props.children}
      </div>
    </FocusTrapZone>
  );

  React.useEffect(() => {
    clearTimeout(state.onModalCloseTimer);
    // Opening the dialog
    if (props.isOpen) {
      if (!isOpen) {
        // First Open
        setIsOpen(true);
        // Add a keyUp handler for all key up events when the dialog is open
        if (props.dragOptions) {
          registerForKeyUp();
        }
      } else {
        // Modal has been opened
        // Reopen during closing
        setHasBeenOpened(true);
        setIsVisible(true);

        if (props.topOffsetFixed) {
          const dialogMain = document.getElementsByClassName('ms-Dialog-main');
          let modalRectangle;
          if (dialogMain.length > 0) {
            modalRectangle = dialogMain[0].getBoundingClientRect();
            setModalRectangleTop(modalRectangle.top);
          }
        }

        // Closing the dialog
        if (!props.isOpen && isOpen) {
          state.onModalCloseTimer = safeSetTimeout(() => {
            onModalClose();
          }, parseFloat(animationDuration) * 1000);
          setIsVisible(false);
        }
      }
    }
  }, [isOpen, isVisible, props.isOpen, props.dragOptions, props.topOffsetFixed]);

  // Component did mount
  React.useEffect(() => {
    if (isOpen && isVisible) {
      registerForKeyUp();
    }
  }, [isOpen, isVisible]);

  // Component did update
  React.useEffect(() => {
    if (!state.prevProps.isOpen && !isVisible) {
      setIsVisible(true);
      state.prevProps = props;
    }
  }, [state.prevProps, isOpen]);

  useComponentRef(props, focusTrapZone);

  // @temp tuatology - Will adjust this to be a panel at certain breakpoints
  if (responsiveMode! >= ResponsiveMode.small) {
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
                // tslint:disable-next-line:no-any
                onClick={isBlocking ? undefined : (onDismiss as any)}
                allowTouchBodyScroll={allowTouchBodyScroll}
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
  return null;
};

ModalBase.displayName = COMPONENT_NAME;
ModalBase.DefaultLayerProps = {
  eventBubblingEnabled: false,
};
