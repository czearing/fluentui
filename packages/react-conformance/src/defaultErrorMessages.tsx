import { IsConformantOptions } from './types';

import { EOL } from 'os';
import * as _ from 'lodash';
import * as path from 'path';

import { errorMessageColors, formatArray, getErrorMessage } from './utils/errorMessages';

/* eslint-disable @typescript-eslint/naming-convention */

/**
 * General structure of isConformant error messages:
 *
 * ```txt
 * It appears that `displayName` [has some issue].
 *
 * Possible solutions:
 * 1. suggestion
 * 2. suggestion
 *
 * Also check the original error message in case there's some other issue:
 *
 * `error`
 * ```
 */
export const defaultErrorMessages = {
  /**
   * Displays an error message for when there is no existing `docblock` in the componentPath or the `docblock`
   * doesn't meet the given `min` and `max` length requirements.
   */
  'has-docblock': (testInfo: IsConformantOptions, error: Error, docblock: string, wordCount: number | undefined) => {
    const { displayName, componentPath } = testInfo;
    const { testErrorInfo, testErrorPath, resolveInfo } = errorMessageColors;

    if (wordCount === undefined) {
      // Parsing error or something--need to just look at the original error
      return getErrorMessage({
        displayName,
        overview: `has an invalid docblock in the file:${EOL}${testErrorPath(componentPath)}`,
        error,
      });
    }

    // Handles scenario where there is no existing docblock in the componentPath.
    if (wordCount === 0) {
      // Error message example:
      //
      // It appears that "displayName" doesn't have a docblock in the file: "componentPath".
      // Possible solutions:
      // 1. Consider adding a 5 to 25 word doc comment on the component.
      return getErrorMessage({
        displayName,
        overview: `doesn't have a docblock in the file:${EOL}${testErrorPath(componentPath)}`,
        suggestions: [
          `Consider adding a ${resolveInfo('5')} to ${resolveInfo('25')} word doc comment on the component`,
        ],
        error,
      });
    }

    // Handles scenario where a docblock exists but doesn't meet the min and max requirements.
    return getErrorMessage({
      displayName,
      overview: `docblock is not between ${resolveInfo('5')} and ${resolveInfo('25')} words.`,
      details: [`It has a word count of ${testErrorInfo('' + wordCount)}. Here is the docblock:`, '', docblock],
      error,
    });
  },

  /**
   * Displays an error message for when there are no matching exported components that match the displayName
   */
  'exports-component': (testInfo: IsConformantOptions, error: Error, exportNames: string[]) => {
    const { componentPath, displayName } = testInfo;
    const { testErrorPath, resolveInfo } = errorMessageColors;

    return getErrorMessage({
      displayName,
      overview: `is not exported from:${EOL}${testErrorPath(componentPath)}`,
      details: [`The available exports are: ${exportNames.join(', ')}`],
      suggestions: [
        `Make sure that your component's file contains an export for ${resolveInfo(displayName)}.`,
        testInfo.useDefaultExport
          ? `Make sure your component file has ${resolveInfo(displayName)} as its default export.`
          : `Check to see if your component uses ${resolveInfo('export default')} and consider enabling ${resolveInfo(
              'useDefaultExport',
            )} in your isConformant test.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when an invalid return is received.
   */
  'component-renders': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName, requiredProps } = testInfo;
    const { testErrorInfo, resolveInfo } = errorMessageColors;

    // Handles scenario where an invalid return is received and there are requiredProps.
    if (requiredProps) {
      const formattedRequiredProps = Object.entries(requiredProps)
        .map(([propName, propValue]) => `  ${propName}: ${propValue}`)
        .join(',' + EOL);

      return getErrorMessage({
        displayName,
        overview: "doesn't render successfully.",
        details: ['It currently is receiving the requiredProps:', testErrorInfo(formattedRequiredProps)],
        suggestions: [
          `Make sure you're including all of the required props to render in isConformant ${resolveInfo(
            'requiredProps',
          )}.`,
          `Make sure that your component's implementation contains a valid return statement.`,
          `Check to see if your component works as expected with Enzyme's ${resolveInfo('mount()')}.`,
        ],
        error,
      });
    }

    // Handles scenario where an invalid return is received and there are no requiredProps.
    return getErrorMessage({
      displayName,
      overview: "doesn't render successfully and is not receiving any requiredProps.",
      suggestions: [
        `Make sure that your are including all of the required props to render in isConformant ` +
          resolveInfo('requiredProps') +
          '.',
        `Make sure that your component's implementation contains a valid return statement.`,
        `Check to see if your component works as expected with Enzyme's ${resolveInfo('mount()')}.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when the component's display name is undefined or doesn't match the passed in
   * displayName.
   */
  'component-has-displayname': (testInfo: IsConformantOptions, error: Error) => {
    const { componentPath, Component, displayName } = testInfo;
    const { testErrorInfo, testErrorPath, resolveInfo } = errorMessageColors;
    const constructorName = Component.prototype?.constructor.name;
    const componentDisplayName = Component.displayName || constructorName;

    // Handles scenario where the component's display name doesn't match isConformant's displayName
    if (!componentDisplayName || componentDisplayName === 'Styledundefined') {
      return getErrorMessage({
        displayName,
        overview: `doesn't have a display name in:${EOL}${testErrorPath(componentPath)}`,
        suggestions: [
          `Make sure the component file contains ${resolveInfo(`${displayName}.displayName = '${displayName}'`)}`,
          `Check to see if a wrapper isn't propagating ${resolveInfo(displayName)}'s displayName.`,
        ],
        error,
      });
    }

    // Handles scenario where the component's display name doesn't match isConformant's displayName
    return getErrorMessage({
      displayName,
      overview: `has an incorrect display name. It received: ${testErrorInfo(
        componentDisplayName.replace('Styled', ''),
      )}`,
      suggestions: [
        `Make sure the component file contains ${resolveInfo(`${displayName}.displayName = '${displayName}'`)}`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when the ref is not defined when being passed to a component.
   */
  'component-handles-ref': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName } = testInfo;
    const { resolveInfo } = errorMessageColors;

    return getErrorMessage({
      displayName,
      overview: `doesn't handle the "ref" prop.`,
      suggestions: [
        `Check if your component has a ${resolveInfo('ref')} prop.`,
        `For function components, make sure that you are using ${resolveInfo('forwardRef')}.`,
        `Check if your component passes the ref to an inner component and add ${resolveInfo('targetComponent')} ` +
          'to isConformant in your test file.',
        `If your component uses an "elementRef" prop instead of "ref", add ${resolveInfo(
          `elementRefName: 'elementRef'`,
        )} to isConformant in your test file.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when the ref doesn't match the DOM node.
   */
  'component-has-root-ref': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName } = testInfo;
    const { resolveInfo } = errorMessageColors;

    return getErrorMessage({
      displayName,
      overview: `doesn't apply the "ref" prop to its root DOM node.`,
      suggestions: [
        `Make sure you're applying the ref to the ${resolveInfo('root element')} in your component.`,
        `Check if your component uses an element ref and add ${resolveInfo(
          `elementRefName: 'elementRef'`,
        )} to isConformant in your test file.`,
        `Check if your component passes ref to an inner component and add ${resolveInfo(
          `targetComponent`,
        )} to isConformant in your test file.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when the className prop doesn't exist or isn't applied on the component.
   */
  'component-handles-classname': (
    testInfo: IsConformantOptions,
    error: Error,
    testClassName: string,
    classNames: string[] | undefined,
    componentHTML: string,
  ) => {
    const { displayName } = testInfo;
    const { testErrorInfo, resolveInfo, failedError, testErrorName } = errorMessageColors;

    // Show part of the HTMl in the debug message if possible
    const debugHTML = componentHTML.includes(testClassName)
      ? componentHTML.substr(0, componentHTML.indexOf(testClassName) + 50) + '...'
      : '';

    return getErrorMessage({
      displayName,
      overview: `doesn't have a properly applied 'className' prop.`,
      details: [
        `After passing a test className ${testErrorInfo(`"${testClassName}"`)} to ${testErrorName(
          displayName,
        )} it received:`,
        `    ${failedError(`className="${classNames?.join(' ')}"`)}`,
        ...(debugHTML ? ['', 'Partial HTML:', debugHTML] : []),
      ],
      suggestions: [
        `Make sure that your component ${resolveInfo('accepts a className prop')}.`,
        `Make sure that nothing is ${resolveInfo('overwriting')} the className prop ` +
          `(it should be merged with defaults).`,
        `Make sure that your ${resolveInfo('component is applying')} the className to the root.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when the user-provided classNames overwrite the default className.
   */
  'component-preserves-default-classname': (
    testInfo: IsConformantOptions,
    error: Error,
    testClassName: string,
    defaultClassName: string,
    classNames: string[] | undefined,
  ) => {
    const { displayName } = testInfo;
    const { testErrorInfo, resolveInfo, failedError, testErrorName } = errorMessageColors;

    return getErrorMessage({
      displayName,
      overview: `overwrites default classNames with the user-supplied className.`,
      details: [
        `After passing a test classname ${testErrorInfo(`"${testClassName}"`)} to ${testErrorName(
          displayName,
        )} it received a className:`,
        `    ${failedError(`className='${classNames?.join(' ')}'`)}`,
        '',
        `Since ${testErrorName(displayName)} has a default className "${testErrorInfo(
          defaultClassName,
        )}" it should have been merged with the user-supplied className.`,
      ],
      suggestions: [
        `Check the placement of your className and ensure that it is ${resolveInfo('merged')} with defaults.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when the displayName doesn't match the component's filename.
   */
  'name-matches-filename': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName, componentPath } = testInfo;
    const { testErrorInfo, resolveInfo } = errorMessageColors;
    const fileName = path.basename(componentPath, path.extname(componentPath));

    return getErrorMessage({
      displayName,
      overview: "doesn't have a matching filename.",
      details: [
        `It received a filename called ${testErrorInfo(fileName)} instead of ${testErrorInfo(displayName)}.`,
        `(full path: ${componentPath})`,
      ],
      suggestions: [
        `Make sure that your component's filename matches the displayName "${resolveInfo(
          displayName,
        )}" passed to isConformant`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when the displayName doesn't exist in the index file.
   */
  'exported-top-level': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName, componentPath } = testInfo;
    const { testErrorPath, resolveInfo } = errorMessageColors;
    const rootPath = componentPath.replace(/[\\/]src[\\/].*/, '');
    const indexFile = path.join(rootPath, 'src', 'index');

    const exportInfo = testInfo.useDefaultExport
      ? `export { default as ${displayName} } from './${displayName};`
      : `export * from './${displayName}';`;

    return getErrorMessage({
      displayName,
      overview: `doesn't have a top level export in:${EOL}${testErrorPath(indexFile)}`,
      suggestions: [
        `Make sure that your component's ${resolveInfo('index.ts')} file contains \`${resolveInfo(exportInfo)}\``,
        `Check if your component is internal and consider enabling ${resolveInfo(
          'isInternal',
        )} in your isConformant test.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when the displayName doesn't match the component's filename
   */
  'has-top-level-file': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName, componentPath } = testInfo;
    const { testErrorPath, resolveInfo } = errorMessageColors;
    const rootPath = componentPath.replace(/[\\/]src[\\/].*/, '');
    const topLevelFile = path.join(rootPath, 'src', displayName);

    return getErrorMessage({
      displayName,
      overview: `doesn't have a top level file in:${EOL}${testErrorPath(topLevelFile)}`,
      suggestions: [
        `Make sure that your component's folder and name match its displayName: ${resolveInfo(displayName)}`,
        `Check if your component is internal and consider enabling ${resolveInfo(
          'isInternal',
        )} in your isConformant test.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when the child component is not a static property of the parent.
   */
  'is-static-property-of-parent': (testInfo: IsConformantOptions, error: Error) => {
    const { componentPath, displayName } = testInfo;
    const { testErrorInfo, resolveInfo } = errorMessageColors;
    const componentFolder = componentPath.replace(path.basename(componentPath) + path.extname(componentPath), '');
    const dirName = path.basename(componentFolder).replace(path.extname(componentFolder), '');

    return getErrorMessage({
      displayName,
      overview: `is not a static property of its parent ${testErrorInfo(dirName)} (inferred from the directory name)`,
      suggestions: [
        `Include the child component ${resolveInfo(displayName)} as a static property of ${resolveInfo(dirName)}.`,
        `Check to see if ${resolveInfo(
          displayName,
        )} is a parent component but contained in a directory with a different name.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when an aria prop doesn't match kebab-casing.
   * Note: the original error isn't included in params since the test's final checks are narrowly scoped
   */
  'kebab-aria-attributes': (testInfo: IsConformantOptions, invalidProps: string[]) => {
    const { displayName } = testInfo;
    const { testErrorName } = errorMessageColors;
    const ariaPropsDiff = invalidProps.map(prop => {
      const replacement = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      return prop + ' → ' + replacement;
    });

    return getErrorMessage({
      displayName,
      overview: `has aria prop(s) that don't use kebab-casing.`,
      suggestions: [
        'Rename the props as follows:',
        testErrorName(formatArray(ariaPropsDiff)),
        "For props that shouldn't be renamed, add them to isConformant `testOptions['']",
      ],
    });
  },

  /**
   * Displays an error message for when the second word in a callback ends with "ed".
   * Note: the original error isn't included in params since the test's final checks are narrowly scoped
   */
  'consistent-callback-names': (testInfo: IsConformantOptions, invalidProps: string[]) => {
    const { displayName } = testInfo;
    const { testErrorInfo, resolveInfo } = errorMessageColors;

    return getErrorMessage({
      displayName,
      overview: 'uses non-standard callback naming.',
      details: ['These callback(s) need to be renamed:', testErrorInfo(formatArray(invalidProps))],
      suggestions: [
        `Rename ${resolveInfo(displayName + `'s`)} callback props to use present tense (no "ed" ending)`,
        `If the name is correct, add the prop to isConformant ${resolveInfo(
          "testOptions['consistent-callback-names'].ignoreProps",
        )}.`,
      ],
    });
  },

  /**
   * Displays an error message for when attempting to render as a functional component
   * and pass `as` to the next component.
   */
  'as-renders-fc': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName } = testInfo;
    const { resolveInfo } = errorMessageColors;

    return getErrorMessage({
      displayName,
      overview: `"as" prop doesn't properly handle a function component.`,
      suggestions: [
        `If your component doesn't have an "as" prop, enable isConformant's ${resolveInfo('skipAsPropTests')} option.`,
        `If your component uses forwardRef, enable isConformant's ${resolveInfo('asPropHandlesRef')} option.`,
        `Check if you are missing any ${resolveInfo('requiredProps')} within the test's isConformant.`,
        `Make sure that your component code contains a valid return statement.`,
        `Check to see if your component works as expected with Enzyme's ${resolveInfo('mount()')}.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when attempting to render as a class component
   * and pass `as` to the next component.
   */
  'as-renders-react-class': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName } = testInfo;
    const { resolveInfo } = errorMessageColors;

    return getErrorMessage({
      displayName,
      overview: `"as" prop doesn't properly handle a class component.`,
      suggestions: [
        `If your component doesn't have an "as" prop, enable isConformant's ${resolveInfo('skipAsPropTests')} option.`,
        `If your component uses forwardRef, enable isConformant's ${resolveInfo('asPropHandlesRef')} option.`,
        `Check if you are missing any ${resolveInfo('requiredProps')} within the test's isConformant.`,
        `Make sure that your component's implementation contains a valid return statement.`,
        `Check to see if your component works as expected with Enzyme's ${resolveInfo('mount()')}.`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when a component with the `as` prop, doesn't pass extra props to the
   * component that it renders.
   */
  'as-passes-as-value': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName } = testInfo;
    const { resolveInfo } = errorMessageColors;

    return getErrorMessage({
      displayName,
      overview: `doesn't pass extra props to the component it renders as.`,
      suggestions: [
        `If your component doesn't have an "as" prop, enable isConformant's ${resolveInfo('skipAsPropTests')} option.`,
        `Ensure that you are ${resolveInfo('spreading extra props')} to the "as" component when rendering.`,
        `Ensure that there is not a problem rendering the component (check previous test results).`,
      ],
      error,
    });
  },

  /**
   * Displays an error message for when a component with the `as` prop, doesn't render component as HTML tags.
   */
  'as-renders-html': (testInfo: IsConformantOptions, error: Error) => {
    const { displayName } = testInfo;
    const { resolveInfo } = errorMessageColors;

    return getErrorMessage({
      displayName,
      overview: `"as" prop doesn't properly handle HTML tags.`,
      suggestions: [
        `If your component doesn't have an "as" prop, enable isConformant's ${resolveInfo('skipAsPropTests')} option.`,
        `Make sure that your component can correctly render as ${resolveInfo('HTML tags')}.`,
        `Check if you are missing any ${resolveInfo('requiredProps')} within the isConformant in your test file.`,
        `Make sure that your component's implementation contains a valid return statement.`,
        `Check to see if your component works as expected with Enzyme's ${resolveInfo('mount()')}.`,
      ],
      error,
    });
  },
};
