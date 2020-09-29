import { IsConformantOptions } from './types';
import { ComponentDoc } from 'react-docgen-typescript';

import chalk from 'chalk';
import * as _ from 'lodash';
import * as path from 'path';

/* eslint-disable @typescript-eslint/naming-convention */

export const defaultErrorMessages = {
  'component-renders': (componentInfo: ComponentDoc, testInfo: IsConformantOptions, error: string) => {
    const { displayName, componentPath, requiredProps } = testInfo;
    const typesFile = componentPath.replace('tsx', 'types.ts');

    // It appears that displayName doesn't have a valid return.
    // It currently is receiving the requiredProps: "requiredProps"
    // Check to see if you are including all of the required props in your types file: typesFile
    if (requiredProps) {
      console.log(
        defaultErrorMessage(
          `component-renders`,
          displayName,
          'valid return. It currently is receiving the requiredProps:' +
            paragraph() +
            chalk.green(formatObject(requiredProps)) +
            paragraph() +
            'Check to see if you are including all of the required props in your types file: ' +
            paragraph() +
            chalk.green.italic(typesFile),
        ) +
          resolveErrorMessages([
            `Make sure that your are including all of the required props to render in isConformant ` +
              chalk.hex('#f7ae65').bold('requiredProps') +
              '.',
            `Make sure that your component's ` +
              chalk.hex('#e00000')(displayName + '.base.tsx') +
              ' file contains a valid return statement.',
            'Check to see if your component works as expected with' +
              chalk.hex('#e00000')(' mount ') +
              'and' +
              chalk.hex('#e00000')(' safeMount') +
              '.',
          ]),
        receivedErrorMessage(error),
      );
    }

    // It appears that "displayName" doesn't have a valid return and is not receiving any requiredProps.
    // Check to see if you are missing any required props in your component's types file: "typesFile"
    else {
      console.log(
        defaultErrorMessage(
          `component-renders`,
          displayName,
          'valid return and is not receiving any requiredProps.' +
            paragraph() +
            `Check to see if you are missing any required props in your component's types file:` +
            paragraph() +
            chalk.green.italic(typesFile),
        ) +
          resolveErrorMessages([
            `Make sure that your are including all of the required props to render in isConformant ` +
              chalk.hex('#e00000')('requiredProps') +
              '.',
            `Make sure that your component's ` +
              chalk.hex('#e00000')(displayName + '.base.tsx') +
              ' file contains a valid return statement.',
            'Check to see if your component works as expected with' +
              chalk.hex('#e00000').bold(' mount ') +
              'and' +
              chalk.hex('#c70000').bold(' safeMount') +
              '.',
          ]),
        receivedErrorMessage(error),
      );
    }
  },

  'exported-top-level': (componentInfo: ComponentDoc, testInfo: IsConformantOptions, error: string) => {
    const { displayName, componentPath } = testInfo;
    const rootPath = componentPath.replace(/[\\/]src[\\/].*/, '');
    const indexFile = path.join(rootPath, 'src', 'index');

    // It appears that "displayName" doesn't have a top level export in: "indexFile".
    console.log(
      defaultErrorMessage(
        `exported-top-level`,
        displayName,
        'top level export in:' + paragraph() + chalk.green.italic(indexFile),
      ) +
        resolveErrorMessages([
          `Make sure that your component's ` +
            chalk.hex('#e00000')('index.ts') +
            ' file contains ' +
            chalk.hex('#e00000')(`export * from './` + displayName + `';`),
          'Check if your component is internal and consider enabling' +
            chalk.hex('#e00000')(' isInternal ') +
            'in your isConformant test.',
        ]),
      receivedErrorMessage(error),
    );
  },

  'has-top-level-file': (componentInfo: ComponentDoc, testInfo: IsConformantOptions, error: string) => {
    const { displayName, componentPath } = testInfo;
    const rootPath = componentPath.replace(/[\\/]src[\\/].*/, '');
    const topLevelFile = path.join(rootPath, 'src', displayName);

    // It appears that "displayName" doesn't have a top level file in: "topLevelFile"
    console.log(
      defaultErrorMessage(
        `has-top-level-file`,
        displayName,
        'top level file in:' + paragraph() + chalk.green.italic(topLevelFile),
      ) +
        resolveErrorMessages([
          `Make sure that your components folder and name match it's displayName: ` + chalk.white.bold(displayName),
          'Check if your component is internal and consider enabling' +
            chalk.hex('#e00000')(' isInternal ') +
            'in your isConformant test.',
        ]) +
        receivedErrorMessage(error),
    );
  },

  'component-has-displayname': (componentInfo: ComponentDoc, testInfo: IsConformantOptions, error: string) => {
    const { componentPath, Component, displayName } = testInfo;
    const constructorName = Component.prototype?.constructor.name;
    const componentDisplayName = Component.displayName || constructorName;
    const fileName = path.basename(componentPath);

    // It appears that "displayName" doesn't have a display name in: "componentPath"
    if (componentDisplayName === (null || 'Styledundefined')) {
      console.log(
        defaultErrorMessage(
          `component-has-displayname`,
          displayName,
          'display name in:' + paragraph() + chalk.green.italic(componentPath),
        ) +
          resolveErrorMessages([
            'Make sure that ' +
              chalk.hex('#e00000')(fileName) +
              ' contains ' +
              chalk.hex('#e00000')(displayName + '.displayName = COMPONENT_NAME') +
              '.',
          ]) +
          receivedErrorMessage(error),
      );
    }

    // It appears that "displayName" doesn't have a correct display name. It received: "componentDisplayName"
    else {
      console.log(
        defaultErrorMessage(
          `component-has-displayname`,
          displayName,
          'correct display name. It received: ' + chalk.green.bold(componentDisplayName.replace('Styled', '')),
        ) +
          resolveErrorMessages([
            'Make sure that ' + fileName + ' contains ' + chalk.hex('#e00000')('{ import ./version }') + '.',
            'Make sure that your version.ts file is configured correctly.',
          ]) +
          receivedErrorMessage(error),
      );
    }
  },
};

/** Generates the message for resolving the test error.
 *  @param resolveMessages Why the test is failing.
 */
function resolveErrorMessages(resolveMessages: string[]) {
  const resolveMessage = [];

  for (let i = 0; i < resolveMessages.length; i++) {
    resolveMessage.push(paragraph() + chalk.cyan(i + 1 + '. ' + resolveMessages[i]));
  }

  return paragraph() + chalk.yellow.bold('To resolve this issue:') + resolveMessage.join('') + paragraph();
}

/** Generates the starting default error message: ( "It appears that __displayName__ doesn't have a __errorMessage__." )
 *  @param testName The conformance test's name.
 *  @param displayName The component's name.
 *  @param errorMessage Why the test is failing.
 */
function defaultErrorMessage(testName: string, displayName: string, errorMessage: string) {
  return (
    paragraph() +
    chalk.white.bold.italic.bgHex('#2e2e2e')(testName) +
    paragraph() +
    chalk.yellow(`It appears that `) +
    chalk.white(displayName) +
    chalk.yellow(` doesn't have a ` + errorMessage) +
    paragraph()
  );
}

/** Generates caught error message in defaultTests.
 *  @param error The caught error message in defaultTests.
 */
function receivedErrorMessage(error: string) {
  return paragraph() + chalk.white.bold.bgRed(`Here's the full error message:`) + paragraph() + error + paragraph(2);
}

/** Generates a paragraph.
 *  @param numberOfParagraphs The number of paragraphs to generate.
 */
function paragraph(numberOfParagraphs?: number) {
  if (numberOfParagraphs) {
    const paragraphs = [];
    for (let i = -1; i < numberOfParagraphs; i++) {
      paragraphs.push(`
`);
    }
    return paragraphs.join('');
  } else {
    return `

`;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatObject(obj: any) {
  const results = [];

  for (const libName of Object.keys(obj)) {
    results.push(`${libName}: ${obj[libName] + ','}`);
  }

  return results.join('\n');
}
