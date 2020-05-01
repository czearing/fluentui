import * as React from 'react';
import {
  warnDeprecations,
  classNamesFunction,
  divProperties,
  getInitials,
  getNativeProps,
  getRTL,
} from 'office-ui-fabric-react/lib/Utilities';
import { mergeStyles } from 'office-ui-fabric-react/lib/Styling';
import { PersonaPresence } from 'office-ui-fabric-react/lib/components/Persona/PersonaPresence/index';
import { Icon } from 'office-ui-fabric-react/lib/Icon';
import { Image, ImageFit, ImageLoadState } from 'office-ui-fabric-react/lib/Image';
import {
  IPersonaCoinProps,
  IPersonaCoinStyleProps,
  IPersonaCoinStyles,
  IPersonaPresenceProps,
  PersonaPresence as PersonaPresenceEnum,
  PersonaSize,
} from 'office-ui-fabric-react/lib/components/Persona/Persona.types';
import { getPersonaInitialsColor } from 'office-ui-fabric-react/lib/components/Persona/PersonaInitialsColor';
import { sizeToPixels } from 'office-ui-fabric-react/lib/components/Persona/PersonaConsts';
import { useBoolean } from '@uifabric/react-hooks';

const getClassNames = classNamesFunction<IPersonaCoinStyleProps, IPersonaCoinStyles>({
  // There can be many PersonaCoin rendered with different sizes.
  // Therefore setting a larger cache size.
  cacheSize: 100,
});

export interface IPersonaState {
  isImageLoaded?: boolean;
  isImageError?: boolean;
}

/**
 * PersonaCoin with no default styles.
 * [Use the `getStyles` API to add your own styles.](https://github.com/microsoft/fluentui/wiki/Styling)
 */

export const PersonaCoinBase: React.FunctionComponent = (props: IPersonaCoinProps) => {
  const [isImageLoaded, { toggle: toggleIsImageLoaded }] = useBoolean(false);
  const [isImageError, { toggle: toggleIsImageError }] = useBoolean(false);

  const {
    size = PersonaSize.size48,
    className,
    coinProps,
    showUnknownPersonaCoin,
    coinSize,
    styles,
    imageUrl,
    imageAlt = '',
    isOutOfOffice,
    // tslint:disable:deprecation
    onRenderCoin = onRenderCoinValues,
    onRenderPersonaCoin = onRenderCoin,
    // tslint:enable:deprecation
    onRenderInitials = onRenderInitialsValues,
    presence = PersonaPresenceEnum.none,
    presenceTitle,
    presenceColors,
    showInitialsUntilImageLoads,
    theme,
  } = props;
  size = props.size as PersonaSize;

  const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(props, divProperties);
  const divCoinProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(coinProps || {}, divProperties);
  const coinSizeStyle = coinSize ? { width: coinSize, height: coinSize } : undefined;
  const hideImage = showUnknownPersonaCoin;
  const personaPresenceProps: IPersonaPresenceProps = {
    coinSize,
    isOutOfOffice,
    presence,
    presenceTitle,
    presenceColors,
    size,
    theme,
  };
  // Use getStyles from props, or fall back to getStyles from styles file.
  const classNames = getClassNames(styles, {
    theme: theme!,
    className: coinProps && coinProps.className ? coinProps.className : className,
    size,
    coinSize,
    showUnknownPersonaCoin,
  });
  const shouldRenderInitials = Boolean(
    !isImageLoaded && ((showInitialsUntilImageLoads && imageUrl) || !imageUrl || isImageError || hideImage),
  );

  const onRenderCoinValues = (renderCoinProps: IPersonaCoinProps): JSX.Element | null => {
    const {
      coinSize,
      styles,
      imageUrl,
      imageAlt,
      imageShouldFadeIn,
      imageShouldStartVisible,
      theme,
      showUnknownPersonaCoin,
    } = renderCoinProps;
    // Render the Image component only if an image URL is provided
    if (!imageUrl) {
      return null;
    }
    const size = props.size as PersonaSize;
    // const classNames = getClassNames(styles, {
    //   theme: theme!,
    //   size,
    //   showUnknownPersonaCoin,
    // });
    const dimension = coinSize || sizeToPixels[size];
    return (
      <Image
        className={classNames.image}
        imageFit={ImageFit.cover}
        src={imageUrl}
        width={dimension}
        height={dimension}
        alt={imageAlt}
        shouldFadeIn={imageShouldFadeIn}
        shouldStartVisible={imageShouldStartVisible}
        onLoadingStateChange={onPhotoLoadingStateChange}
      />
    );
  };

  /**
   * Deprecation helper for getting text.
   */
  const getText = (): string => {
    // tslint:disable-next-line:deprecation
    return props.text || props.primaryText || '';
  };

  const onRenderInitialsValues = (renderInitialProps: IPersonaCoinProps): JSX.Element => {
    let { imageInitials } = renderInitialProps;
    const { allowPhoneInitials, showUnknownPersonaCoin } = renderInitialProps;
    if (showUnknownPersonaCoin) {
      return <Icon iconName="Help" />;
    }
    const isRTL = getRTL(props.theme);
    imageInitials = imageInitials || getInitials(getText(), isRTL, allowPhoneInitials);
    return imageInitials !== '' ? <span>{imageInitials}</span> : <Icon iconName="Contact" />;
  };

  const onPhotoLoadingStateChange = (loadState: ImageLoadState) => {
    toggleIsImageLoaded();
    toggleIsImageError();
    props.onPhotoLoadingStateChange && props.onPhotoLoadingStateChange(loadState);
  };
  return (
    <div role="presentation" {...divProps} className={classNames.coin}>
      {// Render PersonaCoin if size is not size8. size10 and tiny need to removed after a deprecation cleanup.
      // tslint:disable-next-line:deprecation
      size !== PersonaSize.size8 && size !== PersonaSize.size10 && size !== PersonaSize.tiny ? (
        <div role="presentation" {...divCoinProps} className={classNames.imageArea} style={coinSizeStyle}>
          {shouldRenderInitials && (
            <div
              className={mergeStyles(
                classNames.initials,
                !showUnknownPersonaCoin && {
                  backgroundColor: getPersonaInitialsColor(props),
                },
              )}
              style={coinSizeStyle}
              aria-hidden="true"
            >
              {onRenderInitials(props, onRenderInitials)}
            </div>
          )}
          {!hideImage && onRenderPersonaCoin(props, onRenderCoin)}
          <PersonaPresence {...personaPresenceProps} />
        </div>
      ) : // Otherwise, render just PersonaPresence.
      props.presence ? (
        <PersonaPresence {...personaPresenceProps} />
      ) : (
        // Just render Contact Icon if there isn't a Presence prop.
        <Icon iconName="Contact" className={classNames.size10WithoutPresenceIcon} />
      )}
      {props.children}
    </div>
  );
};

// export class PersonaCoinBase extends React.Component<IPersonaCoinProps, IPersonaState> {
//   public static defaultProps: IPersonaCoinProps = {
//     size: PersonaSize.size48,
//     presence: PersonaPresenceEnum.none,
//     imageAlt: '',
//   };

//   constructor(props: IPersonaCoinProps) {
//     super(props);

//     if (process.env.NODE_ENV !== 'production') {
//       warnDeprecations('PersonaCoin', props, { primaryText: 'text' });
//     }

//     this.state = {
//       isImageLoaded: false,
//       isImageError: false,
//     };
//   }

//   // tslint:disable-next-line function-name
//   public UNSAFE_componentWillReceiveProps(nextProps: IPersonaCoinProps): void {
//     if (nextProps.imageUrl !== this.props.imageUrl) {
//       this.setState({
//         isImageLoaded: false,
//         isImageError: false,
//       });
//     }
//   }

//   public render(): JSX.Element | null {
//     const {
//       className,
//       coinProps,
//       showUnknownPersonaCoin,
//       coinSize,
//       styles,
//       imageUrl,
//       isOutOfOffice,
//       // tslint:disable:deprecation
//       onRenderCoin = this._onRenderCoin,
//       onRenderPersonaCoin = onRenderCoin,
//       // tslint:enable:deprecation
//       onRenderInitials = this._onRenderInitials,
//       presence,
//       presenceTitle,
//       presenceColors,
//       showInitialsUntilImageLoads,
//       theme,
//     } = this.props;

//     const size = this.props.size as PersonaSize;
//     const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(this.props, divProperties);
//     const divCoinProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(coinProps || {}, divProperties);
//     const coinSizeStyle = coinSize ? { width: coinSize, height: coinSize } : undefined;
//     const hideImage = showUnknownPersonaCoin;

//     const personaPresenceProps: IPersonaPresenceProps = {
//       coinSize,
//       isOutOfOffice,
//       presence,
//       presenceTitle,
//       presenceColors,
//       size,
//       theme,
//     };

//     // Use getStyles from props, or fall back to getStyles from styles file.
//     const classNames = getClassNames(styles, {
//       theme: theme!,
//       className: coinProps && coinProps.className ? coinProps.className : className,
//       size,
//       coinSize,
//       showUnknownPersonaCoin,
//     });

//     const shouldRenderInitials = Boolean(
//       !this.state.isImageLoaded &&
//         ((showInitialsUntilImageLoads && imageUrl) || !imageUrl || this.state.isImageError || hideImage),
//     );

//     return (
//       <div role="presentation" {...divProps} className={classNames.coin}>
//         {// Render PersonaCoin if size is not size8. size10 and tiny need to removed after a deprecation cleanup.
//         // tslint:disable-next-line:deprecation
//         size !== PersonaSize.size8 && size !== PersonaSize.size10 && size !== PersonaSize.tiny ? (
//           <div role="presentation" {...divCoinProps} className={classNames.imageArea} style={coinSizeStyle}>
//             {shouldRenderInitials && (
//               <div
//                 className={mergeStyles(
//                   classNames.initials,
//                   !showUnknownPersonaCoin && { backgroundColor: getPersonaInitialsColor(this.props) },
//                 )}
//                 style={coinSizeStyle}
//                 aria-hidden="true"
//               >
//                 {onRenderInitials(this.props, this._onRenderInitials)}
//               </div>
//             )}
//             {!hideImage && onRenderPersonaCoin(this.props, this._onRenderCoin)}
//             <PersonaPresence {...personaPresenceProps} />
//           </div>
//         ) : // Otherwise, render just PersonaPresence.
//         this.props.presence ? (
//           <PersonaPresence {...personaPresenceProps} />
//         ) : (
//           // Just render Contact Icon if there isn't a Presence prop.
//           <Icon iconName="Contact" className={classNames.size10WithoutPresenceIcon} />
//         )}
//         {this.props.children}
//       </div>
//     );
//   }

//   private _onRenderCoin = (props: IPersonaCoinProps): JSX.Element | null => {
//     const {
//       coinSize,
//       styles,
//       imageUrl,
//       imageAlt,
//       imageShouldFadeIn,
//       imageShouldStartVisible,
//       theme,
//       showUnknownPersonaCoin,
//     } = this.props;

//     // Render the Image component only if an image URL is provided
//     if (!imageUrl) {
//       return null;
//     }

//     const size = this.props.size as PersonaSize;

//     const classNames = getClassNames(styles, {
//       theme: theme!,
//       size,
//       showUnknownPersonaCoin,
//     });

//     const dimension = coinSize || sizeToPixels[size];

//     return (
//       <Image
//         className={classNames.image}
//         imageFit={ImageFit.cover}
//         src={imageUrl}
//         width={dimension}
//         height={dimension}
//         alt={imageAlt}
//         shouldFadeIn={imageShouldFadeIn}
//         shouldStartVisible={imageShouldStartVisible}
//         onLoadingStateChange={this._onPhotoLoadingStateChange}
//       />
//     );
//   };

//   /**
//    * Deprecation helper for getting text.
//    */
//   private _getText(): string {
//     // tslint:disable-next-line:deprecation
//     return this.props.text || this.props.primaryText || '';
//   }

//   private _onRenderInitials = (props: IPersonaCoinProps): JSX.Element => {
//     let { imageInitials } = props;
//     const { allowPhoneInitials, showUnknownPersonaCoin } = props;

//     if (showUnknownPersonaCoin) {
//       return <Icon iconName="Help" />;
//     }

//     const isRTL = getRTL(this.props.theme);

//     imageInitials = imageInitials || getInitials(this._getText(), isRTL, allowPhoneInitials);

//     return imageInitials !== '' ? <span>{imageInitials}</span> : <Icon iconName="Contact" />;
//   };

//   private _onPhotoLoadingStateChange = (loadState: ImageLoadState) => {
//     this.setState({
//       isImageLoaded: loadState === ImageLoadState.loaded,
//       isImageError: loadState === ImageLoadState.error,
//     });

//     this.props.onPhotoLoadingStateChange && this.props.onPhotoLoadingStateChange(loadState);
//   };
// }
