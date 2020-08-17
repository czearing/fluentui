import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Fabric } from '../../Fabric';
import { ILayerProps, ILayerStyleProps, ILayerStyles } from './Layer.types';
import { classNamesFunction, getDocument, setPortalAttribute, setVirtualParent } from '../../Utilities';
import { registerLayer, getDefaultTarget, unregisterLayer } from './Layer.notification';
import { useMergedRefs, useWarnings } from '@uifabric/react-hooks';

const getClassNames = classNamesFunction<ILayerStyleProps, ILayerStyles>();

const onFilterEvent = (ev: React.SyntheticEvent<HTMLElement>): void => {
  // We should just be able to check ev.bubble here and only stop events that are bubbling up. However, even though
  // mouseEnter and mouseLeave do NOT bubble up, they are showing up as bubbling. Therefore we stop events based on
  // event name rather than ev.bubble.
  if (
    ev.eventPhase === Event.BUBBLING_PHASE &&
    ev.type !== 'mouseenter' &&
    ev.type !== 'mouseleave' &&
    ev.type !== 'touchstart' &&
    ev.type !== 'touchend'
  ) {
    ev.stopPropagation();
  }
};

const useUnmount = (unmountFunction: () => void) => {
  const unmountRef = React.useRef(unmountFunction);
  unmountRef.current = unmountFunction;
  React.useEffect(
    () => () => {
      if (unmountRef.current) {
        unmountRef.current();
      }
    },
    [unmountFunction],
  );
};

export const LayerBase = React.forwardRef<HTMLDivElement, ILayerProps>((props, ref) => {
  const [currentHostId, setCurrentHostId] = React.useState<string | undefined>();
  const [currentlayerElement, setCurrentlayerElement] = React.useState<HTMLElement | undefined>();
  const rootRef = React.useRef<HTMLSpanElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const {
    eventBubblingEnabled,
    styles,
    theme,
    className,
    hostId,
    onLayerDidMount = () => undefined,
    // eslint-disable-next-line deprecation/deprecation
    onLayerMounted = () => undefined,
    onLayerWillUnmount,
    insertFirst,
    children,
  } = props;

  const classNames = getClassNames(styles!, {
    theme: theme!,
    className,
    isNotHost: !hostId,
  });

  const removeLayerElement = React.useCallback((): void => {
    if (onLayerWillUnmount) {
      onLayerWillUnmount();
    }

    if (currentlayerElement && currentlayerElement.parentNode) {
      const parentNode = currentlayerElement.parentNode;
      if (parentNode) {
        parentNode.removeChild(currentlayerElement);
      }
    }
  }, [currentlayerElement, onLayerWillUnmount]);

  const getHost = React.useCallback((): Node | undefined => {
    const doc = getDocument(rootRef.current);
    if (!doc) {
      return undefined;
    }

    if (hostId) {
      return doc.getElementById(hostId) as Node;
    } else {
      const defaultHostSelector = getDefaultTarget();
      return defaultHostSelector ? (doc.querySelector(defaultHostSelector) as Node) : doc.body;
    }
  }, [hostId]);

  const createLayerElement = React.useCallback(() => {
    const doc = getDocument(rootRef.current);
    const host = getHost();

    if (!doc || !host) {
      return;
    }

    // If one was already existing, remove.
    removeLayerElement();

    const layerElement = doc.createElement('div');

    layerElement.className = classNames.root!;
    setPortalAttribute(layerElement);
    setVirtualParent(layerElement, rootRef.current!);

    insertFirst ? host.insertBefore(layerElement, host.firstChild) : host.appendChild(layerElement);

    setCurrentHostId(hostId);
    setCurrentlayerElement(layerElement);

    if (onLayerMounted) {
      onLayerMounted();
    }

    if (onLayerDidMount) {
      onLayerDidMount();
    }
  }, [onLayerMounted, onLayerDidMount, getHost, insertFirst, classNames.root, hostId, removeLayerElement]);

  React.useEffect(() => {
    createLayerElement();
    if (hostId) {
      registerLayer(hostId, createLayerElement);
    }
  }, []);

  React.useEffect(() => {
    if (hostId !== currentHostId) {
      createLayerElement();
    }
  }, [hostId, currentHostId, createLayerElement]);

  useUnmount(() => {
    removeLayerElement();
    if (hostId) {
      unregisterLayer(hostId, createLayerElement);
    }
  });

  useDebugWarnings(props);

  return (
    <span className="ms-layer" ref={mergedRef}>
      {currentlayerElement &&
        ReactDOM.createPortal(
          <Fabric {...(!eventBubblingEnabled && getFilteredEvents())} className={classNames.content}>
            {children}
          </Fabric>,
          currentlayerElement,
        )}
    </span>
  );
});
LayerBase.displayName = 'LayerBase';

let filteredEventProps: { [key: string]: (ev: React.SyntheticEvent<HTMLElement, Event>) => void };

function useDebugWarnings(props: ILayerProps) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- build-time conditional
    useWarnings({
      name: 'Layer',
      props,
      deprecations: { onLayerMounted: 'onLayerDidMount' },
    });
  }
}

function getFilteredEvents() {
  if (!filteredEventProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredEventProps = {} as any;
    [
      'onClick',
      'onContextMenu',
      'onDoubleClick',
      'onDrag',
      'onDragEnd',
      'onDragEnter',
      'onDragExit',
      'onDragLeave',
      'onDragOver',
      'onDragStart',
      'onDrop',
      'onMouseDown',
      'onMouseEnter',
      'onMouseLeave',
      'onMouseMove',
      'onMouseOver',
      'onMouseOut',
      'onMouseUp',
      'onTouchMove',
      'onTouchStart',
      'onTouchCancel',
      'onTouchEnd',
      'onKeyDown',
      'onKeyPress',
      'onKeyUp',
      'onFocus',
      'onBlur',
      'onChange',
      'onInput',
      'onInvalid',
      'onSubmit',
    ].forEach(name => (filteredEventProps[name] = onFilterEvent));
  }
  return filteredEventProps;
}
