import * as React from 'react';
import {
  classNamesFunction,
  allowScrollOnElement,
  allowOverscrollOnElement,
  KeyCodes,
  elementContains,
  warnDeprecations,
  EventGroup,
} from '../../Utilities';
import { FocusTrapZone, IFocusTrapZone } from 'office-ui-fabric-react/src/components/FocusTrapZone/index';
import { IModalProps, IModalStyleProps, IModalStyles } from './Modal.types';
import { Overlay } from '../../Overlay';
import { ILayerProps, Layer } from '../../Layer';
import { Popup } from '../Popup/index';
import { ResponsiveMode } from 'office-ui-fabric-react/lib/utilities/decorators/withResponsiveMode';
import { DirectionalHint } from 'office-ui-fabric-react/src/components/Callout/index';
import { Icon } from 'office-ui-fabric-react/src/components/Icon/index';
import { DraggableZone, IDragData } from 'office-ui-fabric-react/lib/utilities/DraggableZone/index';

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

const getClassNames = classNamesFunction<IModalStyleProps, IModalStyles>();
const COMPONENT_NAME = 'Modal';

export const ModalBase = (props: React.PropsWithChildren<IModalProps>) => {
  const focusTrapZone = React.useRef<IFocusTrapZone>(null);
  // const [id, setId] = React.useState(getId('Modal'));
  const [isModalMenuOpen, setIsModalMenuOpen] = React.useState();
  const [isInKeyboardMoveMode, setisInKeyboardMoveMode] = React.useState();
  const [modalRectangleTop, setModalRectangleTop] = React.useState();
  const [isOpen, setIsOpen] = React.useState(props.isOpen);
  const [isVisible, setIsVisible] = React.useState(props.isOpen);
  const [hasBeenOpened, setHasBeenOpened] = React.useState(props.isOpen);
  const [x, setX] = React.useState(0);
  const [y, setY] = React.useState(0);

  let scrollableContent: HTMLDivElement | null = null;
  const events = new EventGroup(this);
  let lastSetX: number;
  let lastSetY: number;
  let hasRegisteredKeyUp: boolean = false;
  const { allowTouchBodyScroll = false } = props;

  warnDeprecations(COMPONENT_NAME, props, {
    onLayerDidMount: 'layerProps.onLayerDidMount',
  });

  const {
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
    // tslint:disable-next-line:deprecation
    onLayerDidMount,
    isModeless,
    dragOptions,
  } = props;

  if (!isOpen) {
    return null;
  }

  const layerClassName = layerProps === undefined ? '' : layerProps.className;

  const classNames = getClassNames(styles, {
    theme: theme!,
    className,
    containerClassName,
    scrollableContentClassName,
    isOpen,
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
      events.off(scrollableContent);
    }
    scrollableContent = elt;
  };

  const onModalContextMenuClose = (): void => {
    setIsModalMenuOpen(false);
  };

  const onModalClose = (): void => {
    lastSetX = 0;
    lastSetY = 0;
    setIsOpen(false);
    setX(0);
    setY(0);
    setIsModalMenuOpen(false);
    setisInKeyboardMoveMode(false);
    setIsOpen(false);
    setX(0);
    setY(0);

    if (props.dragOptions && hasRegisteredKeyUp) {
      events.off(window, 'keyup', onKeyUp, true /* useCapture */);
    }

    // Call the onDismiss callback
    if (props.onDismissed) {
      props.onDismissed();
    }
  };

  const onDragStart = (): void => {
    setIsModalMenuOpen(false);
    setisInKeyboardMoveMode(false);
  };

  const onDrag = (_: React.MouseEvent<HTMLElement> & React.TouchEvent<HTMLElement>, ui: IDragData): void => {
    setX(x + ui.delta.x);
    setY(y + ui.delta.y);
  };

  const onDragStop = (): void => {
    focus();
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLElement>): void => {
    // Need to handle the CTRL + ALT + SPACE key during keyup due to FireFox bug:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1220143
    // Otherwise it would continue to fire a click even if the event was cancelled
    // during mouseDown.
    if (event.altKey && event.ctrlKey && event.keyCode === KeyCodes.space) {
      // Since this is a global handler, we should make sure the target is within the dialog
      // before opening the dropdown
      if (elementContains(scrollableContent, event.target as HTMLElement)) {
        setIsModalMenuOpen(!isModalMenuOpen);
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

    if (isModalMenuOpen && (event.altKey || event.keyCode === KeyCodes.escape)) {
      setIsModalMenuOpen(false);
    }

    if (isInKeyboardMoveMode && (event.keyCode === KeyCodes.escape || event.keyCode === KeyCodes.enter)) {
      setisInKeyboardMoveMode(false);
      event.preventDefault();
      event.stopPropagation();
    }

    if (isInKeyboardMoveMode) {
      let handledEvent = true;
      const delta = getMoveDelta(event);

      switch (event.keyCode) {
        case KeyCodes.escape:
          setX(lastSetX);
          setY(lastSetY);
        case KeyCodes.enter: {
          lastSetX = 0;
          lastSetY = 0;
          setisInKeyboardMoveMode(false);
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
    lastSetX = x;
    lastSetY = y;
    setisInKeyboardMoveMode(true);
    setIsModalMenuOpen(false);
    events.on(window, 'keydown', onKeyDown, true /* useCapture */);
  };

  const onExitKeyboardMoveMode = () => {
    lastSetX = 0;
    lastSetY = 0;
    setisInKeyboardMoveMode(false);
    events.off(window, 'keydown', onKeyDown, true /* useCapture */);
  };

  const registerForKeyUp = (): void => {
    if (!hasRegisteredKeyUp) {
      events.on(window, 'keyup', onKeyUp, true /* useCapture */);
      hasRegisteredKeyUp = true;
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
      focusPreviouslyFocusedInnerElement
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
        {dragOptions && isModalMenuOpen && (
          <dragOptions.menu
            items={[
              { key: 'move', text: dragOptions.moveMenuItemText, onClick: onEnterKeyboardMoveMode },
              { key: 'close', text: dragOptions.closeMenuItemText, onClick: onModalClose },
            ]}
            onDismiss={onModalContextMenuClose}
            alignTargetEdge
            coverTarget
            directionalHint={DirectionalHint.topLeftEdge}
            directionalHintFixed
            shouldFocusOnMount
            target={scrollableContent}
          />
        )}
        {props.children}
      </div>
    </FocusTrapZone>
  );

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
    }

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
  }
  return null;
};
