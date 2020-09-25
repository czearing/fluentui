import { IsConformantOptions } from './types';
import { ComponentDoc } from 'react-docgen-typescript';

import chalk from 'chalk';

import * as _ from 'lodash';
import * as path from 'path';

/* eslint-disable @typescript-eslint/naming-convention */

export const defaultTestErrorMessages = {
  'has-top-level-version-import': (componentInfo: ComponentDoc, testInfo: IsConformantOptions) => {
    const { componentPath, packageVersion, displayName } = testInfo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packages = (window as any).__packages__;

    if (packages === null) {
      console.log(
        chalk.yellow(
          errorMessage(displayName) +
            `doesn't have a version import for ` +
            chalk.red(packageVersion) +
            ` in ` +
            chalk.green.underline.italic(
              path.join(componentPath.replace(/[\\/]src[\\/].*/, ''), 'src', displayName + '.ts'),
            ) +
            `.`,
        ),
      );
    } else {
      console.log(
        chalk.yellow(
          errorMessage(displayName) +
            `doesn't have a correct version import package name for ` +
            chalk.red.underline.bold(packageVersion) +
            paragraph() +
            `Here's a list of it's top level version files:` +
            paragraph(2) +
            chalk.green.underline.italic(formatJSON(packages)) +
            paragraph(4) +
            'To resolve this issue try:',
        ),
      );
    }
  },
};

function errorMessage(displayName: string) {
  return paragraph() + `It appears that ` + chalk.red.underline.bold(displayName) + ` `;
}

/** Generates a paragraph. */
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
function formatJSON(obj: any) {
  const results = [];

  for (const libName of Object.keys(obj)) {
    results.push(`${libName}: ${obj[libName].join(', ')}`);
  }

  return results.join('\n');
}
