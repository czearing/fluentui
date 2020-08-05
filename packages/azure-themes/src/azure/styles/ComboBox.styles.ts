import { ITheme } from 'office-ui-fabric-react/lib/Styling';
import { Depths } from '../AzureDepths';
import { IComboBoxStyles } from 'office-ui-fabric-react/lib/ComboBox';
import { FontSizes } from '../AzureType';
import * as StyleConstants from '../Constants';
import { IExtendedSemanticColors } from '../IExtendedSemanticColors';

export const ComboBoxStyles = (theme: ITheme): Partial<IComboBoxStyles> => {
  const { semanticColors } = theme;
  const extendedSemanticColors = semanticColors as IExtendedSemanticColors;

  return {
    root: {
      height: StyleConstants.inputControlHeight,
      fontSize: FontSizes.size13,
      lineHeight: StyleConstants.inputControlHeight,
      selectors: {
        '.ms-Button': {
          backgroundColor: semanticColors.bodyBackground,
          color: semanticColors.inputText,
          paddingTop: '5px',
        },
        '.ms-Button:hover': {
          backgroundColor: semanticColors.bodyBackground,
          color: extendedSemanticColors.primaryButtonTextHovered,
        },
        '&.is-open': {
          borderColor: semanticColors.focusBorder,
        },
        '.ms-Button-icon': {
          height: StyleConstants.inputControlHeightInner,
        },
      },
    },
    input: {
      height: StyleConstants.inputControlHeightInner,
      selectors: {
        '::placeholder': {
          fontStyle: 'italic',
        },
        '::-ms-input-placeholder': {
          fontStyle: 'italic',
        },
      },
    },
    rootDisabled: {
      selectors: {
        '.ms-Button': {
          backgroundColor: semanticColors.disabledBackground,
          color: semanticColors.inputText,
        },
        '.ms-Button:hover': {
          backgroundColor: semanticColors.disabledBackground,
          color: semanticColors.inputText,
        },
      },
    },
    rootFocused: {
      borderColor: semanticColors.focusBorder,
    },
    rootError: {
      borderColor: semanticColors.errorBackground,
      borderWidth: StyleConstants.borderWidthError,
    },
    rootPressed: {
      borderColor: semanticColors.focusBorder,
    },
    callout: {
      border: 'none',
      boxShadow: Depths.depth8,
      selectors: {
        '.ms-Callout-main': {
          backgroundColor: semanticColors.inputBackground,
          borderColor: semanticColors.inputBorder,
          borderStyle: StyleConstants.borderSolid,
          borderWidth: StyleConstants.borderWidth,
        },
      },
    },
    divider: {
      backgroundColor: semanticColors.inputBorder,
      border: 'none',
      height: '1px',
    },
    errorMessage: {
      color: semanticColors.errorText,
      fontSize: FontSizes.size13,
    },
    optionsContainer: {
      verticalAlign: 'middle',
      selectors: {
        '.ms-ComboBox-header': {
          color: semanticColors.inputText,
          fontSize: FontSizes.size13,
        },
        '.ms-ComboBox-option': {
          color: semanticColors.bodyText,
          fontSize: FontSizes.size13,
          selectors: {
            ':hover': {
              backgroundColor: semanticColors.menuItemBackgroundHovered,
              border: '1px solid transparent',
              color: extendedSemanticColors.buttonTextHovered,
            },
          },
        },
        '.is-checked': {
          backgroundColor: semanticColors.listItemBackgroundChecked,
        },
        '.is-disabled': {
          color: semanticColors.disabledBodyText,
        },
      },
    },
  };
};
