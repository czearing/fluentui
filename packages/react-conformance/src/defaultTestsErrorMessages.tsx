import { TestObject, IsConformantOptions } from './types';
import { ComponentDoc } from 'react-docgen-typescript';
import { getComponent } from './utils/getComponent';
import { mount } from 'enzyme';
import parseDocblock from './utils/parseDocblock';

import chalk from 'chalk';
import * as React from 'react';
import * as _ from 'lodash';
import * as path from 'path';
import consoleUtil from './utils/consoleUtil';

export const defaultTestErrorMessages = {
  'has-top-level-version-import': (componentInfo: ComponentDoc, testInfo: IsConformantOptions) => {
    const { componentPath, packageVersion, displayName } = testInfo;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packages = (window as any).__packages__;

    if (packages === null) {
      console.error(
        chalk.yellow(
          `It appears that ` +
            chalk.red.underline.bold(displayName) +
            ` doesn't have a version import for ` +
            chalk.red(packageVersion) +
            ` in ` +
            chalk.green.underline.italic(path.join(rootPath, 'src', displayName + '.ts')) +
            `.`,
        ),
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatVersions = (obj: any) => {
        const results = [];

        for (const libName of Object.keys(obj)) {
          results.push(`${libName}: ${obj[libName].join(', ')}`);
        }

        return results.join('\n');
      };

      console.warn(
        chalk.yellow(
          `It appears that ` +
            chalk.red.underline.bold(displayName) +
            ` doesn't have a correct version import for ` +
            chalk.red.underline.bold(packageVersion) +
            `.` +
            `
                Here's a list of it's top level version files:"` +
            (`
` +
              chalk.green.italic(formatVersions(packages))) +
            `"`,
        ),
      );
      throw Error;
    }
  },
};
