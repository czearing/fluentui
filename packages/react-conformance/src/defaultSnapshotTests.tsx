import { TestObject, IsConformantOptions } from './types';
import { ComponentDoc } from 'react-docgen-typescript';

import * as React from 'react';
import { ReactTestRenderer } from 'react-test-renderer';
import chalk from 'chalk';
import * as _ from 'lodash';
import * as glob from 'glob';
import * as path from 'path';

import { create } from '@uifabric/utilities/lib/test';
import * as mergeStylesSerializer from '@uifabric/jest-serializer-merge-styles';
import { resetIds } from 'office-ui-fabric-react/lib/Utilities';
/* eslint-disable @typescript-eslint/naming-convention */

export const defaultSnapshotTests: TestObject = {
  /** Component examples match snapshots */
  'component-examples-match-snapshot': (componentInfo: ComponentDoc, testInfo: IsConformantOptions) => {
    const snapshotsStateMap = new Map<string, ISnapshotState>();
    const jestSnapshot = require('jest-snapshot');
    const { componentPath, excludedExampleSnapshotTest } = testInfo;
    const rootPath = componentPath.replace(/[\\/]src[\\/].*/, '');
    const examplePaths: string[] = glob.sync(path.resolve(rootPath, 'src/components/**/examples/*Example*.tsx'));

    // jest-snapshot currently has no DefinitelyTyped or module defs so type the one object we care about for now here
    interface ISnapshotState {
      _updateSnapshot: string;
      unmatched: number;
      matched: number;
      updated: number;
      added: number;
      getUncheckedCount(): number;
      removeUncheckedKeys(): void;
      save(): void;
    }

    jestSnapshot.addSerializer(mergeStylesSerializer);

    expect.extend({
      toMatchSpecificSnapshot(received, snapshotFile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globalSnapshotState: ISnapshotState = (this as any).snapshotState;

        // Append .shot to prevent jest failure when it finds .snaps without associated tests.
        const absoluteSnapshotFile = rootPath + '/src/components/__snapshots__/' + snapshotFile + '.shot';

        // let's try to retrieve the state from the map - maybe there was already a test that created it
        let snapshotState = snapshotsStateMap.get(absoluteSnapshotFile);

        if (!snapshotState) {
          // if this is a first test that want to use this snapshot, let's create it
          // We have to grab global state's _updateSnapshot setting to make sure jest configuration is honored
          snapshotState = new jestSnapshot.SnapshotState(absoluteSnapshotFile, {
            snapshotPath: absoluteSnapshotFile,
            updateSnapshot: globalSnapshotState._updateSnapshot,
          });
          // and save it to the map for tracking
          snapshotsStateMap.set(absoluteSnapshotFile, snapshotState!);
        }

        const newThis = { ...this, snapshotState };
        const patchedToMatchSnapshot = jestSnapshot.toMatchSnapshot.bind(newThis);

        return patchedToMatchSnapshot(received);
      },
    });

    for (const examplePath of examplePaths) {
      const exampleFile = path.basename(examplePath);
      if (excludedExampleSnapshotTest?.includes(exampleFile)) {
        continue;
      }

      it(`renders ${exampleFile} correctly`, () => {
        // Resetting ids for each example creates predictability in generated ids.
        resetIds();

        const exampleModule = require(examplePath);

        const exampleExportNames = Object.keys(exampleModule);
        const ComponentUnderTest: React.ComponentType = exampleModule[exampleExportNames[0]];
        if (exampleExportNames.length > 1 || typeof ComponentUnderTest !== 'function') {
          throw new Error(
            'Examples should export exactly one React component, and nothing else.\n' +
              `Found: ${exampleExportNames.map(exp => `${exp} (${typeof exampleModule[exp]})`).join(', ')}`,
          );
        }

        let component: ReactTestRenderer;
        try {
          component = create(<ComponentUnderTest />);
        } catch (e) {
          // Log with console.log so that the console.warn/error overrides from jest-setup.js don't re-throw the
          // exception in a way that hides the stack/info; and then manually re-throw
          console.log(
            chalk.red(
              `Failure rendering ${exampleExportNames[0]} (from ${examplePath}) as a React component.\n` +
                'Example files must export exactly one React component, and nothing else.\n' +
                '(This error may also occur if an exception is thrown while rendering the example component.)',
            ),
          );
          throw e;
        }

        const tree = component!.toJSON();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (expect(tree) as any).toMatchSpecificSnapshot(exampleFile);
      });
    }
  },
};
