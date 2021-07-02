'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function(resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, '__esModule', { value: true });
const devkit_1 = require('@nrwl/devkit');
const workspace_1 = require('@nrwl/workspace');
const update_jestconfig_1 = require('@nrwl/jest/src/generators/jest-project/lib/update-jestconfig');
const path = require('path');
function default_1(tree, schema) {
  return __awaiter(this, void 0, void 0, function*() {
    const userLog = [];
    if (schema.stats) {
      printStats(tree, schema);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
    validateUserInput(tree, schema);
    const options = normalizeOptions(tree, schema);
    // 1. update TsConfigs
    updatedLocalTsConfig(tree, options);
    updatedBaseTsConfig(tree, options);
    // 2. update Jest
    updateLocalJestConfig(tree, options);
    updateRootJestConfig(tree, options);
    // 3. setup storybook
    setupStorybook(tree, options);
    // 4. move stories to package
    moveStorybookFromReactExamples(tree, options, userLog);
    removeMigratedPackageFromReactExamples(tree, options, userLog);
    // 5. update package npm scripts
    updateNpmScripts(tree, options);
    updateApiExtractorForLocalBuilds(tree, options);
    updateNxWorkspace(tree, options);
    yield devkit_1.formatFiles(tree);
    return () => {
      printUserLogs(userLog);
    };
  });
}
exports.default = default_1;
// ==== helpers ====
const templates = {
  apiExtractorLocal: {
    $schema: 'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
    extends: './api-extractor.json',
    mainEntryPointFilePath: '<projectFolder>/dist/<unscopedPackageName>/src/index.d.ts',
  },
  apiExtractor: {
    $schema: 'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
    extends: '@fluentui/scripts/api-extractor/api-extractor.common.json',
  },
  tsconfig: {
    extends: '../../tsconfig.base.json',
    include: ['src'],
    compilerOptions: {
      target: 'ES5',
      module: 'CommonJS',
      lib: ['es5', 'dom'],
      outDir: 'dist',
      jsx: 'react',
      declaration: true,
      experimentalDecorators: true,
      importHelpers: true,
      noUnusedLocals: true,
      preserveConstEnums: true,
      types: ['jest', 'custom-global', 'inline-style-expand-shorthand'],
    },
  },
  jest: options => devkit_1.stripIndents`
      // @ts-check

      /**
      * @type {jest.InitialOptions}
      */
      module.exports = {
        displayName: '${options.pkgName}',
        preset: '../../jest.preset.js',
        globals: {
          'ts-jest': {
            tsConfig: '<rootDir>/tsconfig.json',
            diagnostics: false,
          },
        },
        transform: {
          '^.+\\.tsx?$': 'ts-jest',
        },
        coverageDirectory: './coverage',
        setupFilesAfterEnv: ['./config/tests.js'],
        snapshotSerializers: ['@fluentui/jest-serializer-make-styles'],
      };
  `,
  storybook: {
    /* eslint-disable @fluentui/max-len */
    main: devkit_1.stripIndents`
      const rootMain = require('../../../.storybook/main');

      module.exports = /** @type {Pick<import('../../../.storybook/main').StorybookConfig,'addons'|'stories'|'webpackFinal'>} */ ({
        stories: [...rootMain.stories, '../src/**/*.stories.mdx', '../src/**/*.stories.@(ts|tsx)'],
        addons: [...rootMain.addons],
        webpackFinal: (config, options) => {
          const localConfig = { ...rootMain.webpackFinal(config, options) };

          return localConfig;
        },
      });
    `,
    /* eslint-enable @fluentui/max-len */
    preview: devkit_1.stripIndents`
      import * as rootPreview from '../../../.storybook/preview';

      export const decorators = [...rootPreview.decorators];
    `,
    tsconfig: {
      extends: '../tsconfig.json',
      compilerOptions: {
        allowJs: true,
        checkJs: true,
      },
      exclude: ['../**/*.test.ts', '../**/*.test.js', '../**/*.test.tsx', '../**/*.test.jsx'],
      include: ['../src/**/*', '*.js'],
    },
  },
};
function normalizeOptions(host, options) {
  const defaults = {};
  const workspaceConfig = devkit_1.readWorkspaceConfiguration(host);
  const projectConfig = devkit_1.readProjectConfiguration(host, options.name);
  return Object.assign(Object.assign(Object.assign({}, defaults), options), {
    projectConfig,
    workspaceConfig: workspaceConfig,
    /**
     * package name without npmScope (@scopeName)
     */
    normalizedPkgName: options.name.replace(`@${workspaceConfig.npmScope}/`, ''),
    paths: {
      configRoot: devkit_1.joinPathFragments(projectConfig.root, 'config'),
      packageJson: devkit_1.joinPathFragments(projectConfig.root, 'package.json'),
      tsconfig: devkit_1.joinPathFragments(projectConfig.root, 'tsconfig.json'),
      jestConfig: devkit_1.joinPathFragments(projectConfig.root, 'jest.config.js'),
      rootTsconfig: '/tsconfig.base.json',
      rootJestPreset: '/jest.preset.js',
      rootJestConfig: '/jest.config.js',
      storybook: {
        tsconfig: devkit_1.joinPathFragments(projectConfig.root, '.storybook/tsconfig.json'),
        main: devkit_1.joinPathFragments(projectConfig.root, '.storybook/main.js'),
        preview: devkit_1.joinPathFragments(projectConfig.root, '.storybook/preview.js'),
      },
    },
  });
}
function validateUserInput(tree, options) {
  if (!options.name) {
    throw new Error(`--name cannot be empty. Please provide name of the package.`);
  }
  const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
  if (!isPackageConverged(tree, projectConfig)) {
    throw new Error(
      `${options.name} is not converged package. Make sure to run the migration on packages with version 9.x.x`,
    );
  }
}
function printStats(tree, options) {
  const allProjects = devkit_1.getProjects(tree);
  const stats = {
    migrated: [],
    notMigrated: [],
  };
  allProjects.forEach((project, projectName) => {
    if (!isPackageConverged(tree, project)) {
      return;
    }
    if (isProjectMigrated(project)) {
      stats.migrated.push(Object.assign({ projectName }, project));
      return;
    }
    stats.notMigrated.push(Object.assign({ projectName }, project));
  });
  devkit_1.logger.info('Convergence DX migration stats:');
  devkit_1.logger.info('='.repeat(80));
  devkit_1.logger.info(`Migrated (${stats.migrated.length}):`);
  devkit_1.logger.info(stats.migrated.map(projectStat => `- ${projectStat.projectName}`).join('\n'));
  devkit_1.logger.info('='.repeat(80));
  devkit_1.logger.info(`Not migrated (${stats.notMigrated.length}):`);
  devkit_1.logger.info(stats.notMigrated.map(projectStat => `- ${projectStat.projectName}`).join('\n'));
  return tree;
}
function isPackageConverged(tree, project) {
  const packageJson = devkit_1.readJson(tree, devkit_1.joinPathFragments(project.root, 'package.json'));
  return packageJson.version.startsWith('9.');
}
function isProjectMigrated(project) {
  var _a;
  // eslint-disable-next-line eqeqeq
  return (
    project.sourceRoot != null && Boolean((_a = project.tags) === null || _a === void 0 ? void 0 : _a.includes('vNext'))
  );
}
function uniqueArray(value) {
  return Array.from(new Set(value));
}
function updateNxWorkspace(tree, options) {
  var _a;
  devkit_1.updateProjectConfiguration(
    tree,
    options.name,
    Object.assign(Object.assign({}, options.projectConfig), {
      sourceRoot: devkit_1.joinPathFragments(options.projectConfig.root, 'src'),
      tags: uniqueArray([
        ...((_a = options.projectConfig.tags) !== null && _a !== void 0 ? _a : []),
        'vNext',
        'platform:web',
      ]),
    }),
  );
  return tree;
}
function updateNpmScripts(tree, options) {
  devkit_1.updateJson(tree, options.paths.packageJson, json => {
    delete json.scripts['update-snapshots'];
    delete json.scripts['start-test'];
    json.scripts.docs = 'api-extractor run --config=config/api-extractor.local.json --local';
    json.scripts[
      'build:local'
      // eslint-disable-next-line @fluentui/max-len
    ] = `tsc -p . --module esnext --emitDeclarationOnly && node ../../scripts/typescript/normalize-import --output dist/${options.normalizedPkgName}/src && yarn docs`;
    json.scripts.storybook = 'start-storybook';
    json.scripts.start = 'storybook';
    json.scripts.test = 'jest';
    return json;
  });
  return tree;
}
function updateApiExtractorForLocalBuilds(tree, options) {
  devkit_1.writeJson(
    tree,
    devkit_1.joinPathFragments(options.paths.configRoot, 'api-extractor.local.json'),
    templates.apiExtractorLocal,
  );
  devkit_1.writeJson(
    tree,
    devkit_1.joinPathFragments(options.paths.configRoot, 'api-extractor.json'),
    templates.apiExtractor,
  );
  return tree;
}
function setupStorybook(tree, options) {
  tree.write(options.paths.storybook.tsconfig, workspace_1.serializeJson(templates.storybook.tsconfig));
  tree.write(options.paths.storybook.main, templates.storybook.main);
  tree.write(options.paths.storybook.preview, templates.storybook.preview);
  return tree;
}
function moveStorybookFromReactExamples(tree, options, userLog) {
  const reactExamplesConfig = getReactExamplesProjectConfig(tree, options);
  const pathToStoriesWithinReactExamples = `${reactExamplesConfig.root}/src/${options.normalizedPkgName}`;
  const storyPaths = [];
  devkit_1.visitNotIgnoredFiles(tree, pathToStoriesWithinReactExamples, treePath => {
    if (treePath.includes('.stories.')) {
      storyPaths.push(treePath);
    }
  });
  if (storyPaths.length === 0) {
    userLog.push({
      type: 'warn',
      message: 'No package stories found within react-examples. Skipping storybook stories migration...',
    });
    return tree;
  }
  storyPaths.forEach(originPath => {
    var _a;
    const pathSegments = splitPathFragments(originPath);
    const fileName = pathSegments[pathSegments.length - 1];
    const componentName = fileName.replace(/\.stories\.tsx?$/, '');
    let contents = (_a = tree.read(originPath)) === null || _a === void 0 ? void 0 : _a.toString('utf-8');
    if (contents) {
      contents = contents.replace(options.name, './index');
      contents =
        contents +
        '\n\n' +
        devkit_1.stripIndents`
        export default {
            title: 'Components/${componentName}',
            component: ${componentName},
        }
      `;
      tree.write(devkit_1.joinPathFragments(options.projectConfig.root, 'src', fileName), contents);
      return;
    }
    throw new Error(`Error moving ${fileName} from react-examples`);
  });
  return tree;
}
function getReactExamplesProjectConfig(tree, options) {
  return devkit_1.readProjectConfiguration(tree, `@${options.workspaceConfig.npmScope}/react-examples`);
}
function removeMigratedPackageFromReactExamples(tree, options, userLog) {
  const reactExamplesConfig = getReactExamplesProjectConfig(tree, options);
  const paths = {
    packageStoriesWithinReactExamples: `${reactExamplesConfig.root}/src/${options.normalizedPkgName}`,
    packageJson: `${reactExamplesConfig.root}/package.json`,
  };
  if (!tree.exists(paths.packageStoriesWithinReactExamples)) {
    return tree;
  }
  tree.delete(paths.packageStoriesWithinReactExamples);
  userLog.push(
    { type: 'warn', message: `NOTE: Deleting ${reactExamplesConfig.root}/src/${options.normalizedPkgName}` },
    { type: 'warn', message: `      - Please update your moved stories to follow standard storybook format\n` },
  );
  devkit_1.updateJson(tree, paths.packageJson, json => {
    if (json.dependencies) {
      delete json.dependencies[options.name];
    }
    return json;
  });
  return tree;
}
function updateLocalJestConfig(tree, options) {
  tree.write(options.paths.jestConfig, templates.jest({ pkgName: options.normalizedPkgName }));
  return tree;
}
function updateRootJestConfig(tree, options) {
  update_jestconfig_1.updateJestConfig(tree, { project: options.name });
  return tree;
}
function updatedLocalTsConfig(tree, options) {
  var _a, _b;
  const newConfig = Object.assign({}, templates.tsconfig);
  const oldConfig = devkit_1.readJson(tree, options.paths.tsconfig);
  const oldConfigTypes = (_a = oldConfig.compilerOptions.types) !== null && _a !== void 0 ? _a : [];
  const newConfigTypes = (_b = newConfig.compilerOptions.types) !== null && _b !== void 0 ? _b : [];
  const updatedTypes = uniqueArray([...newConfigTypes, ...oldConfigTypes]);
  newConfig.compilerOptions.types = updatedTypes;
  tree.write(options.paths.tsconfig, workspace_1.serializeJson(newConfig));
  return tree;
}
function updatedBaseTsConfig(tree, options) {
  var _a;
  const workspaceConfig = devkit_1.readWorkspaceConfiguration(tree);
  const allProjects = devkit_1.getProjects(tree);
  const projectPkgJson = devkit_1.readJson(tree, options.paths.packageJson);
  const depsThatNeedToBecomeAliases = Object.keys(
    (_a = projectPkgJson.dependencies) !== null && _a !== void 0 ? _a : {},
  )
    .filter(pkgName => pkgName.startsWith(`@${workspaceConfig.npmScope}`))
    .reduce((acc, pkgName) => {
      var _a;
      acc[pkgName] = [`${(_a = allProjects.get(pkgName)) === null || _a === void 0 ? void 0 : _a.root}/src/index.ts`];
      return acc;
    }, {});
  devkit_1.updateJson(tree, options.paths.rootTsconfig, json => {
    var _a;
    json.compilerOptions.paths = (_a = json.compilerOptions.paths) !== null && _a !== void 0 ? _a : {};
    json.compilerOptions.paths[options.name] = [`${options.projectConfig.root}/src/index.ts`];
    Object.assign(json.compilerOptions.paths, depsThatNeedToBecomeAliases);
    return json;
  });
}
function printUserLogs(logs) {
  devkit_1.logger.log(`${'='.repeat(80)}\n`);
  logs.forEach(log => devkit_1.logger[log.type](log.message));
  devkit_1.logger.log(`${'='.repeat(80)}\n`);
}
function splitPathFragments(filePath) {
  return filePath.split(path.sep);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJmaWxlIjoiQzpcXFVzZXJzXFxjemVhclxcRG9jdW1lbnRzXFxmbHVlbnR1aVxcdG9vbHNcXGdlbmVyYXRvcnNcXG1pZ3JhdGUtY29udmVyZ2VkLXBrZ1xcaW5kZXgudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx5Q0Fjc0I7QUFDdEIsK0NBQWdEO0FBQ2hELG9HQUFnRztBQUNoRyw2QkFBNkI7QUF5QjdCLG1CQUErQixJQUFVLEVBQUUsTUFBMEM7O1FBQ25GLE1BQU0sT0FBTyxHQUFZLEVBQUUsQ0FBQztRQUU1QixJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7WUFDaEIsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN6QixnRUFBZ0U7WUFDaEUsT0FBTyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7U0FDakI7UUFFRCxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFaEMsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRS9DLHNCQUFzQjtRQUN0QixvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDcEMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRW5DLGlCQUFpQjtRQUNqQixxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXBDLHFCQUFxQjtRQUNyQixjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTlCLDZCQUE2QjtRQUM3Qiw4QkFBOEIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZELHNDQUFzQyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFL0QsZ0NBQWdDO1FBQ2hDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNoQyxnQ0FB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Q0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xDLENBQUMiLCJuYW1lcyI6W10sInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxjemVhclxcRG9jdW1lbnRzXFxmbHVlbnR1aVxcdG9vbHNcXGdlbmVyYXRvcnNcXG1pZ3JhdGUtY29udmVyZ2VkLXBrZ1xcaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuICBUcmVlLFxyXG4gIGZvcm1hdEZpbGVzLFxyXG4gIHVwZGF0ZUpzb24sXHJcbiAgcmVhZFByb2plY3RDb25maWd1cmF0aW9uLFxyXG4gIHJlYWRXb3Jrc3BhY2VDb25maWd1cmF0aW9uLFxyXG4gIGpvaW5QYXRoRnJhZ21lbnRzLFxyXG4gIHJlYWRKc29uLFxyXG4gIGdldFByb2plY3RzLFxyXG4gIHN0cmlwSW5kZW50cyxcclxuICB2aXNpdE5vdElnbm9yZWRGaWxlcyxcclxuICBsb2dnZXIsXHJcbiAgd3JpdGVKc29uLFxyXG4gIHVwZGF0ZVByb2plY3RDb25maWd1cmF0aW9uLFxyXG59IGZyb20gJ0BucndsL2RldmtpdCc7XHJcbmltcG9ydCB7IHNlcmlhbGl6ZUpzb24gfSBmcm9tICdAbnJ3bC93b3Jrc3BhY2UnO1xyXG5pbXBvcnQgeyB1cGRhdGVKZXN0Q29uZmlnIH0gZnJvbSAnQG5yd2wvamVzdC9zcmMvZ2VuZXJhdG9ycy9qZXN0LXByb2plY3QvbGliL3VwZGF0ZS1qZXN0Y29uZmlnJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuXHJcbmltcG9ydCB7IFBhY2thZ2VKc29uLCBUc0NvbmZpZyB9IGZyb20gJy4uLy4uL3R5cGVzJztcclxuXHJcbmltcG9ydCB7IE1pZ3JhdGVDb252ZXJnZWRQa2dHZW5lcmF0b3JTY2hlbWEgfSBmcm9tICcuL3NjaGVtYSc7XHJcblxyXG4vKipcclxuICogVEFTSzpcclxuICogMS4gbWlncmF0ZSB0byB0eXBlc2NyaXB0IHBhdGggYWxpYXNlcyAtICMxODM0MyDinIVcclxuICogMi4gbWlncmF0ZSB0byB1c2Ugc3RhbmRhcmQgamVzdCBwb3dlcmVkIGJ5IFRTIHBhdGggYWxpYXNlcyAtICMxODM2OCDinIVcclxuICogMy4gYm9vdHN0cmFwIG5ldyBzdG9yeWJvb2sgY29uZmlnIC0gIzE4Mzk0IOKchVxyXG4gKiA0LiBjb2xsb2NhdGUgYWxsIHBhY2thZ2Ugc3RvcmllcyBmcm9tIGByZWFjdC1leGFtcGxlc2AgLSAjMTgzOTQg4pyFXHJcbiAqIDUuIHVwZGF0ZSBucG0gc2NyaXB0cyAoc2V0dXAgZG9jcyB0YXNrIHRvIHJ1biBhcGktZXh0cmFjdG9yIGZvciBsb2NhbCBjaGFuZ2VzIHZlcmlmaWNhdGlvbikgLSAjMTg0MDMg4pyFXHJcbiAqL1xyXG5cclxuaW50ZXJmYWNlIFByb2plY3RDb25maWd1cmF0aW9uIGV4dGVuZHMgUmV0dXJuVHlwZTx0eXBlb2YgcmVhZFByb2plY3RDb25maWd1cmF0aW9uPiB7fVxyXG5cclxuaW50ZXJmYWNlIEFzc2VydGVkU2NoZW1hIGV4dGVuZHMgTWlncmF0ZUNvbnZlcmdlZFBrZ0dlbmVyYXRvclNjaGVtYSB7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgTm9ybWFsaXplZFNjaGVtYSBleHRlbmRzIFJldHVyblR5cGU8dHlwZW9mIG5vcm1hbGl6ZU9wdGlvbnM+IHt9XHJcblxyXG50eXBlIFVzZXJMb2cgPSBBcnJheTx7IHR5cGU6IGtleW9mIHR5cGVvZiBsb2dnZXI7IG1lc3NhZ2U6IHN0cmluZyB9PjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uICh0cmVlOiBUcmVlLCBzY2hlbWE6IE1pZ3JhdGVDb252ZXJnZWRQa2dHZW5lcmF0b3JTY2hlbWEpIHtcclxuICBjb25zdCB1c2VyTG9nOiBVc2VyTG9nID0gW107XHJcblxyXG4gIGlmIChzY2hlbWEuc3RhdHMpIHtcclxuICAgIHByaW50U3RhdHModHJlZSwgc2NoZW1hKTtcclxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktZnVuY3Rpb25cclxuICAgIHJldHVybiAoKSA9PiB7fTtcclxuICB9XHJcblxyXG4gIHZhbGlkYXRlVXNlcklucHV0KHRyZWUsIHNjaGVtYSk7XHJcblxyXG4gIGNvbnN0IG9wdGlvbnMgPSBub3JtYWxpemVPcHRpb25zKHRyZWUsIHNjaGVtYSk7XHJcblxyXG4gIC8vIDEuIHVwZGF0ZSBUc0NvbmZpZ3NcclxuICB1cGRhdGVkTG9jYWxUc0NvbmZpZyh0cmVlLCBvcHRpb25zKTtcclxuICB1cGRhdGVkQmFzZVRzQ29uZmlnKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAvLyAyLiB1cGRhdGUgSmVzdFxyXG4gIHVwZGF0ZUxvY2FsSmVzdENvbmZpZyh0cmVlLCBvcHRpb25zKTtcclxuICB1cGRhdGVSb290SmVzdENvbmZpZyh0cmVlLCBvcHRpb25zKTtcclxuXHJcbiAgLy8gMy4gc2V0dXAgc3Rvcnlib29rXHJcbiAgc2V0dXBTdG9yeWJvb2sodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gIC8vIDQuIG1vdmUgc3RvcmllcyB0byBwYWNrYWdlXHJcbiAgbW92ZVN0b3J5Ym9va0Zyb21SZWFjdEV4YW1wbGVzKHRyZWUsIG9wdGlvbnMsIHVzZXJMb2cpO1xyXG4gIHJlbW92ZU1pZ3JhdGVkUGFja2FnZUZyb21SZWFjdEV4YW1wbGVzKHRyZWUsIG9wdGlvbnMsIHVzZXJMb2cpO1xyXG5cclxuICAvLyA1LiB1cGRhdGUgcGFja2FnZSBucG0gc2NyaXB0c1xyXG4gIHVwZGF0ZU5wbVNjcmlwdHModHJlZSwgb3B0aW9ucyk7XHJcbiAgdXBkYXRlQXBpRXh0cmFjdG9yRm9yTG9jYWxCdWlsZHModHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gIHVwZGF0ZU54V29ya3NwYWNlKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICBhd2FpdCBmb3JtYXRGaWxlcyh0cmVlKTtcclxuXHJcbiAgcmV0dXJuICgpID0+IHtcclxuICAgIHByaW50VXNlckxvZ3ModXNlckxvZyk7XHJcbiAgfTtcclxufVxyXG5cclxuLy8gPT09PSBoZWxwZXJzID09PT1cclxuXHJcbmNvbnN0IHRlbXBsYXRlcyA9IHtcclxuICBhcGlFeHRyYWN0b3JMb2NhbDoge1xyXG4gICAgJHNjaGVtYTogJ2h0dHBzOi8vZGV2ZWxvcGVyLm1pY3Jvc29mdC5jb20vanNvbi1zY2hlbWFzL2FwaS1leHRyYWN0b3IvdjcvYXBpLWV4dHJhY3Rvci5zY2hlbWEuanNvbicsXHJcbiAgICBleHRlbmRzOiAnLi9hcGktZXh0cmFjdG9yLmpzb24nLFxyXG4gICAgbWFpbkVudHJ5UG9pbnRGaWxlUGF0aDogJzxwcm9qZWN0Rm9sZGVyPi9kaXN0Lzx1bnNjb3BlZFBhY2thZ2VOYW1lPi9zcmMvaW5kZXguZC50cycsXHJcbiAgfSxcclxuICBhcGlFeHRyYWN0b3I6IHtcclxuICAgICRzY2hlbWE6ICdodHRwczovL2RldmVsb3Blci5taWNyb3NvZnQuY29tL2pzb24tc2NoZW1hcy9hcGktZXh0cmFjdG9yL3Y3L2FwaS1leHRyYWN0b3Iuc2NoZW1hLmpzb24nLFxyXG4gICAgZXh0ZW5kczogJ0BmbHVlbnR1aS9zY3JpcHRzL2FwaS1leHRyYWN0b3IvYXBpLWV4dHJhY3Rvci5jb21tb24uanNvbicsXHJcbiAgfSxcclxuICB0c2NvbmZpZzoge1xyXG4gICAgZXh0ZW5kczogJy4uLy4uL3RzY29uZmlnLmJhc2UuanNvbicsXHJcbiAgICBpbmNsdWRlOiBbJ3NyYyddLFxyXG4gICAgY29tcGlsZXJPcHRpb25zOiB7XHJcbiAgICAgIHRhcmdldDogJ0VTNScsXHJcbiAgICAgIG1vZHVsZTogJ0NvbW1vbkpTJyxcclxuICAgICAgbGliOiBbJ2VzNScsICdkb20nXSxcclxuICAgICAgb3V0RGlyOiAnZGlzdCcsXHJcbiAgICAgIGpzeDogJ3JlYWN0JyxcclxuICAgICAgZGVjbGFyYXRpb246IHRydWUsXHJcbiAgICAgIGV4cGVyaW1lbnRhbERlY29yYXRvcnM6IHRydWUsXHJcbiAgICAgIGltcG9ydEhlbHBlcnM6IHRydWUsXHJcbiAgICAgIG5vVW51c2VkTG9jYWxzOiB0cnVlLFxyXG4gICAgICBwcmVzZXJ2ZUNvbnN0RW51bXM6IHRydWUsXHJcbiAgICAgIHR5cGVzOiBbJ2plc3QnLCAnY3VzdG9tLWdsb2JhbCcsICdpbmxpbmUtc3R5bGUtZXhwYW5kLXNob3J0aGFuZCddLFxyXG4gICAgfSBhcyBUc0NvbmZpZ1snY29tcGlsZXJPcHRpb25zJ10sXHJcbiAgfSxcclxuICBqZXN0OiAob3B0aW9uczogeyBwa2dOYW1lOiBzdHJpbmcgfSkgPT4gc3RyaXBJbmRlbnRzYFxyXG4gICAgICAvLyBAdHMtY2hlY2tcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAqIEB0eXBlIHtqZXN0LkluaXRpYWxPcHRpb25zfVxyXG4gICAgICAqL1xyXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgICAgICBkaXNwbGF5TmFtZTogJyR7b3B0aW9ucy5wa2dOYW1lfScsXHJcbiAgICAgICAgcHJlc2V0OiAnLi4vLi4vamVzdC5wcmVzZXQuanMnLFxyXG4gICAgICAgIGdsb2JhbHM6IHtcclxuICAgICAgICAgICd0cy1qZXN0Jzoge1xyXG4gICAgICAgICAgICB0c0NvbmZpZzogJzxyb290RGlyPi90c2NvbmZpZy5qc29uJyxcclxuICAgICAgICAgICAgZGlhZ25vc3RpY3M6IGZhbHNlLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRyYW5zZm9ybToge1xyXG4gICAgICAgICAgJ14uK1xcXFwudHN4PyQnOiAndHMtamVzdCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb3ZlcmFnZURpcmVjdG9yeTogJy4vY292ZXJhZ2UnLFxyXG4gICAgICAgIHNldHVwRmlsZXNBZnRlckVudjogWycuL2NvbmZpZy90ZXN0cy5qcyddLFxyXG4gICAgICAgIHNuYXBzaG90U2VyaWFsaXplcnM6IFsnQGZsdWVudHVpL2plc3Qtc2VyaWFsaXplci1tYWtlLXN0eWxlcyddLFxyXG4gICAgICB9O1xyXG4gIGAsXHJcbiAgc3Rvcnlib29rOiB7XHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAZmx1ZW50dWkvbWF4LWxlbiAqL1xyXG4gICAgbWFpbjogc3RyaXBJbmRlbnRzYFxyXG4gICAgICBjb25zdCByb290TWFpbiA9IHJlcXVpcmUoJy4uLy4uLy4uLy5zdG9yeWJvb2svbWFpbicpO1xyXG5cclxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSAvKiogQHR5cGUge1BpY2s8aW1wb3J0KCcuLi8uLi8uLi8uc3Rvcnlib29rL21haW4nKS5TdG9yeWJvb2tDb25maWcsJ2FkZG9ucyd8J3N0b3JpZXMnfCd3ZWJwYWNrRmluYWwnPn0gKi8gKHtcclxuICAgICAgICBzdG9yaWVzOiBbLi4ucm9vdE1haW4uc3RvcmllcywgJy4uL3NyYy8qKi8qLnN0b3JpZXMubWR4JywgJy4uL3NyYy8qKi8qLnN0b3JpZXMuQCh0c3x0c3gpJ10sXHJcbiAgICAgICAgYWRkb25zOiBbLi4ucm9vdE1haW4uYWRkb25zXSxcclxuICAgICAgICB3ZWJwYWNrRmluYWw6IChjb25maWcsIG9wdGlvbnMpID0+IHtcclxuICAgICAgICAgIGNvbnN0IGxvY2FsQ29uZmlnID0geyAuLi5yb290TWFpbi53ZWJwYWNrRmluYWwoY29uZmlnLCBvcHRpb25zKSB9O1xyXG5cclxuICAgICAgICAgIHJldHVybiBsb2NhbENvbmZpZztcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuICAgIGAsXHJcbiAgICAvKiBlc2xpbnQtZW5hYmxlIEBmbHVlbnR1aS9tYXgtbGVuICovXHJcbiAgICBwcmV2aWV3OiBzdHJpcEluZGVudHNgXHJcbiAgICAgIGltcG9ydCAqIGFzIHJvb3RQcmV2aWV3IGZyb20gJy4uLy4uLy4uLy5zdG9yeWJvb2svcHJldmlldyc7XHJcblxyXG4gICAgICBleHBvcnQgY29uc3QgZGVjb3JhdG9ycyA9IFsuLi5yb290UHJldmlldy5kZWNvcmF0b3JzXTtcclxuICAgIGAsXHJcbiAgICB0c2NvbmZpZzoge1xyXG4gICAgICBleHRlbmRzOiAnLi4vdHNjb25maWcuanNvbicsXHJcbiAgICAgIGNvbXBpbGVyT3B0aW9uczoge1xyXG4gICAgICAgIGFsbG93SnM6IHRydWUsXHJcbiAgICAgICAgY2hlY2tKczogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgZXhjbHVkZTogWycuLi8qKi8qLnRlc3QudHMnLCAnLi4vKiovKi50ZXN0LmpzJywgJy4uLyoqLyoudGVzdC50c3gnLCAnLi4vKiovKi50ZXN0LmpzeCddLFxyXG4gICAgICBpbmNsdWRlOiBbJy4uL3NyYy8qKi8qJywgJyouanMnXSxcclxuICAgIH0sXHJcbiAgfSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIG5vcm1hbGl6ZU9wdGlvbnMoaG9zdDogVHJlZSwgb3B0aW9uczogQXNzZXJ0ZWRTY2hlbWEpIHtcclxuICBjb25zdCBkZWZhdWx0cyA9IHt9O1xyXG4gIGNvbnN0IHdvcmtzcGFjZUNvbmZpZyA9IHJlYWRXb3Jrc3BhY2VDb25maWd1cmF0aW9uKGhvc3QpO1xyXG4gIGNvbnN0IHByb2plY3RDb25maWcgPSByZWFkUHJvamVjdENvbmZpZ3VyYXRpb24oaG9zdCwgb3B0aW9ucy5uYW1lKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIC4uLmRlZmF1bHRzLFxyXG4gICAgLi4ub3B0aW9ucyxcclxuICAgIHByb2plY3RDb25maWcsXHJcbiAgICB3b3Jrc3BhY2VDb25maWc6IHdvcmtzcGFjZUNvbmZpZyxcclxuICAgIC8qKlxyXG4gICAgICogcGFja2FnZSBuYW1lIHdpdGhvdXQgbnBtU2NvcGUgKEBzY29wZU5hbWUpXHJcbiAgICAgKi9cclxuICAgIG5vcm1hbGl6ZWRQa2dOYW1lOiBvcHRpb25zLm5hbWUucmVwbGFjZShgQCR7d29ya3NwYWNlQ29uZmlnLm5wbVNjb3BlfS9gLCAnJyksXHJcbiAgICBwYXRoczoge1xyXG4gICAgICBjb25maWdSb290OiBqb2luUGF0aEZyYWdtZW50cyhwcm9qZWN0Q29uZmlnLnJvb3QsICdjb25maWcnKSxcclxuICAgICAgcGFja2FnZUpzb246IGpvaW5QYXRoRnJhZ21lbnRzKHByb2plY3RDb25maWcucm9vdCwgJ3BhY2thZ2UuanNvbicpLFxyXG4gICAgICB0c2NvbmZpZzogam9pblBhdGhGcmFnbWVudHMocHJvamVjdENvbmZpZy5yb290LCAndHNjb25maWcuanNvbicpLFxyXG4gICAgICBqZXN0Q29uZmlnOiBqb2luUGF0aEZyYWdtZW50cyhwcm9qZWN0Q29uZmlnLnJvb3QsICdqZXN0LmNvbmZpZy5qcycpLFxyXG4gICAgICByb290VHNjb25maWc6ICcvdHNjb25maWcuYmFzZS5qc29uJyxcclxuICAgICAgcm9vdEplc3RQcmVzZXQ6ICcvamVzdC5wcmVzZXQuanMnLFxyXG4gICAgICByb290SmVzdENvbmZpZzogJy9qZXN0LmNvbmZpZy5qcycsXHJcbiAgICAgIHN0b3J5Ym9vazoge1xyXG4gICAgICAgIHRzY29uZmlnOiBqb2luUGF0aEZyYWdtZW50cyhwcm9qZWN0Q29uZmlnLnJvb3QsICcuc3Rvcnlib29rL3RzY29uZmlnLmpzb24nKSxcclxuICAgICAgICBtYWluOiBqb2luUGF0aEZyYWdtZW50cyhwcm9qZWN0Q29uZmlnLnJvb3QsICcuc3Rvcnlib29rL21haW4uanMnKSxcclxuICAgICAgICBwcmV2aWV3OiBqb2luUGF0aEZyYWdtZW50cyhwcm9qZWN0Q29uZmlnLnJvb3QsICcuc3Rvcnlib29rL3ByZXZpZXcuanMnKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gdmFsaWRhdGVVc2VySW5wdXQodHJlZTogVHJlZSwgb3B0aW9uczogTWlncmF0ZUNvbnZlcmdlZFBrZ0dlbmVyYXRvclNjaGVtYSk6IGFzc2VydHMgb3B0aW9ucyBpcyBBc3NlcnRlZFNjaGVtYSB7XHJcbiAgaWYgKCFvcHRpb25zLm5hbWUpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgLS1uYW1lIGNhbm5vdCBiZSBlbXB0eS4gUGxlYXNlIHByb3ZpZGUgbmFtZSBvZiB0aGUgcGFja2FnZS5gKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHByb2plY3RDb25maWcgPSByZWFkUHJvamVjdENvbmZpZ3VyYXRpb24odHJlZSwgb3B0aW9ucy5uYW1lKTtcclxuXHJcbiAgaWYgKCFpc1BhY2thZ2VDb252ZXJnZWQodHJlZSwgcHJvamVjdENvbmZpZykpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgYCR7b3B0aW9ucy5uYW1lfSBpcyBub3QgY29udmVyZ2VkIHBhY2thZ2UuIE1ha2Ugc3VyZSB0byBydW4gdGhlIG1pZ3JhdGlvbiBvbiBwYWNrYWdlcyB3aXRoIHZlcnNpb24gOS54LnhgLFxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByaW50U3RhdHModHJlZTogVHJlZSwgb3B0aW9uczogTWlncmF0ZUNvbnZlcmdlZFBrZ0dlbmVyYXRvclNjaGVtYSkge1xyXG4gIGNvbnN0IGFsbFByb2plY3RzID0gZ2V0UHJvamVjdHModHJlZSk7XHJcbiAgY29uc3Qgc3RhdHMgPSB7XHJcbiAgICBtaWdyYXRlZDogW10gYXMgQXJyYXk8UHJvamVjdENvbmZpZ3VyYXRpb24gJiB7IHByb2plY3ROYW1lOiBzdHJpbmcgfT4sXHJcbiAgICBub3RNaWdyYXRlZDogW10gYXMgQXJyYXk8UHJvamVjdENvbmZpZ3VyYXRpb24gJiB7IHByb2plY3ROYW1lOiBzdHJpbmcgfT4sXHJcbiAgfTtcclxuXHJcbiAgYWxsUHJvamVjdHMuZm9yRWFjaCgocHJvamVjdCwgcHJvamVjdE5hbWUpID0+IHtcclxuICAgIGlmICghaXNQYWNrYWdlQ29udmVyZ2VkKHRyZWUsIHByb2plY3QpKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaXNQcm9qZWN0TWlncmF0ZWQocHJvamVjdCkpIHtcclxuICAgICAgc3RhdHMubWlncmF0ZWQucHVzaCh7IHByb2plY3ROYW1lLCAuLi5wcm9qZWN0IH0pO1xyXG5cclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgc3RhdHMubm90TWlncmF0ZWQucHVzaCh7IHByb2plY3ROYW1lLCAuLi5wcm9qZWN0IH0pO1xyXG4gIH0pO1xyXG5cclxuICBsb2dnZXIuaW5mbygnQ29udmVyZ2VuY2UgRFggbWlncmF0aW9uIHN0YXRzOicpO1xyXG4gIGxvZ2dlci5pbmZvKCc9Jy5yZXBlYXQoODApKTtcclxuXHJcbiAgbG9nZ2VyLmluZm8oYE1pZ3JhdGVkICgke3N0YXRzLm1pZ3JhdGVkLmxlbmd0aH0pOmApO1xyXG4gIGxvZ2dlci5pbmZvKHN0YXRzLm1pZ3JhdGVkLm1hcChwcm9qZWN0U3RhdCA9PiBgLSAke3Byb2plY3RTdGF0LnByb2plY3ROYW1lfWApLmpvaW4oJ1xcbicpKTtcclxuXHJcbiAgbG9nZ2VyLmluZm8oJz0nLnJlcGVhdCg4MCkpO1xyXG4gIGxvZ2dlci5pbmZvKGBOb3QgbWlncmF0ZWQgKCR7c3RhdHMubm90TWlncmF0ZWQubGVuZ3RofSk6YCk7XHJcbiAgbG9nZ2VyLmluZm8oc3RhdHMubm90TWlncmF0ZWQubWFwKHByb2plY3RTdGF0ID0+IGAtICR7cHJvamVjdFN0YXQucHJvamVjdE5hbWV9YCkuam9pbignXFxuJykpO1xyXG5cclxuICByZXR1cm4gdHJlZTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNQYWNrYWdlQ29udmVyZ2VkKHRyZWU6IFRyZWUsIHByb2plY3Q6IFByb2plY3RDb25maWd1cmF0aW9uKSB7XHJcbiAgY29uc3QgcGFja2FnZUpzb24gPSByZWFkSnNvbjxQYWNrYWdlSnNvbj4odHJlZSwgam9pblBhdGhGcmFnbWVudHMocHJvamVjdC5yb290LCAncGFja2FnZS5qc29uJykpO1xyXG4gIHJldHVybiBwYWNrYWdlSnNvbi52ZXJzaW9uLnN0YXJ0c1dpdGgoJzkuJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzUHJvamVjdE1pZ3JhdGVkPFQgZXh0ZW5kcyBQcm9qZWN0Q29uZmlndXJhdGlvbj4oXHJcbiAgcHJvamVjdDogVCxcclxuKTogcHJvamVjdCBpcyBUICYgUmVxdWlyZWQ8UGljazxQcm9qZWN0Q29uZmlndXJhdGlvbiwgJ3RhZ3MnIHwgJ3NvdXJjZVJvb3QnPj4ge1xyXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBlcWVxZXFcclxuICByZXR1cm4gcHJvamVjdC5zb3VyY2VSb290ICE9IG51bGwgJiYgQm9vbGVhbihwcm9qZWN0LnRhZ3M/LmluY2x1ZGVzKCd2TmV4dCcpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5pcXVlQXJyYXk8VCBleHRlbmRzIHVua25vd24+KHZhbHVlOiBUW10pIHtcclxuICByZXR1cm4gQXJyYXkuZnJvbShuZXcgU2V0KHZhbHVlKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZU54V29ya3NwYWNlKHRyZWU6IFRyZWUsIG9wdGlvbnM6IE5vcm1hbGl6ZWRTY2hlbWEpIHtcclxuICB1cGRhdGVQcm9qZWN0Q29uZmlndXJhdGlvbih0cmVlLCBvcHRpb25zLm5hbWUsIHtcclxuICAgIC4uLm9wdGlvbnMucHJvamVjdENvbmZpZyxcclxuICAgIHNvdXJjZVJvb3Q6IGpvaW5QYXRoRnJhZ21lbnRzKG9wdGlvbnMucHJvamVjdENvbmZpZy5yb290LCAnc3JjJyksXHJcbiAgICB0YWdzOiB1bmlxdWVBcnJheShbLi4uKG9wdGlvbnMucHJvamVjdENvbmZpZy50YWdzID8/IFtdKSwgJ3ZOZXh0JywgJ3BsYXRmb3JtOndlYiddKSxcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHRyZWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZU5wbVNjcmlwdHModHJlZTogVHJlZSwgb3B0aW9uczogTm9ybWFsaXplZFNjaGVtYSkge1xyXG4gIHVwZGF0ZUpzb24odHJlZSwgb3B0aW9ucy5wYXRocy5wYWNrYWdlSnNvbiwganNvbiA9PiB7XHJcbiAgICBkZWxldGUganNvbi5zY3JpcHRzWyd1cGRhdGUtc25hcHNob3RzJ107XHJcbiAgICBkZWxldGUganNvbi5zY3JpcHRzWydzdGFydC10ZXN0J107XHJcblxyXG4gICAganNvbi5zY3JpcHRzLmRvY3MgPSAnYXBpLWV4dHJhY3RvciBydW4gLS1jb25maWc9Y29uZmlnL2FwaS1leHRyYWN0b3IubG9jYWwuanNvbiAtLWxvY2FsJztcclxuICAgIGpzb24uc2NyaXB0c1tcclxuICAgICAgJ2J1aWxkOmxvY2FsJ1xyXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQGZsdWVudHVpL21heC1sZW5cclxuICAgIF0gPSBgdHNjIC1wIC4gLS1tb2R1bGUgZXNuZXh0IC0tZW1pdERlY2xhcmF0aW9uT25seSAmJiBub2RlIC4uLy4uL3NjcmlwdHMvdHlwZXNjcmlwdC9ub3JtYWxpemUtaW1wb3J0IC0tb3V0cHV0IGRpc3QvJHtvcHRpb25zLm5vcm1hbGl6ZWRQa2dOYW1lfS9zcmMgJiYgeWFybiBkb2NzYDtcclxuICAgIGpzb24uc2NyaXB0cy5zdG9yeWJvb2sgPSAnc3RhcnQtc3Rvcnlib29rJztcclxuICAgIGpzb24uc2NyaXB0cy5zdGFydCA9ICdzdG9yeWJvb2snO1xyXG4gICAganNvbi5zY3JpcHRzLnRlc3QgPSAnamVzdCc7XHJcblxyXG4gICAgcmV0dXJuIGpzb247XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB0cmVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVBcGlFeHRyYWN0b3JGb3JMb2NhbEJ1aWxkcyh0cmVlOiBUcmVlLCBvcHRpb25zOiBOb3JtYWxpemVkU2NoZW1hKSB7XHJcbiAgd3JpdGVKc29uKHRyZWUsIGpvaW5QYXRoRnJhZ21lbnRzKG9wdGlvbnMucGF0aHMuY29uZmlnUm9vdCwgJ2FwaS1leHRyYWN0b3IubG9jYWwuanNvbicpLCB0ZW1wbGF0ZXMuYXBpRXh0cmFjdG9yTG9jYWwpO1xyXG4gIHdyaXRlSnNvbih0cmVlLCBqb2luUGF0aEZyYWdtZW50cyhvcHRpb25zLnBhdGhzLmNvbmZpZ1Jvb3QsICdhcGktZXh0cmFjdG9yLmpzb24nKSwgdGVtcGxhdGVzLmFwaUV4dHJhY3Rvcik7XHJcblxyXG4gIHJldHVybiB0cmVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXR1cFN0b3J5Ym9vayh0cmVlOiBUcmVlLCBvcHRpb25zOiBOb3JtYWxpemVkU2NoZW1hKSB7XHJcbiAgdHJlZS53cml0ZShvcHRpb25zLnBhdGhzLnN0b3J5Ym9vay50c2NvbmZpZywgc2VyaWFsaXplSnNvbih0ZW1wbGF0ZXMuc3Rvcnlib29rLnRzY29uZmlnKSk7XHJcbiAgdHJlZS53cml0ZShvcHRpb25zLnBhdGhzLnN0b3J5Ym9vay5tYWluLCB0ZW1wbGF0ZXMuc3Rvcnlib29rLm1haW4pO1xyXG4gIHRyZWUud3JpdGUob3B0aW9ucy5wYXRocy5zdG9yeWJvb2sucHJldmlldywgdGVtcGxhdGVzLnN0b3J5Ym9vay5wcmV2aWV3KTtcclxuXHJcbiAgcmV0dXJuIHRyZWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVTdG9yeWJvb2tGcm9tUmVhY3RFeGFtcGxlcyh0cmVlOiBUcmVlLCBvcHRpb25zOiBOb3JtYWxpemVkU2NoZW1hLCB1c2VyTG9nOiBVc2VyTG9nKSB7XHJcbiAgY29uc3QgcmVhY3RFeGFtcGxlc0NvbmZpZyA9IGdldFJlYWN0RXhhbXBsZXNQcm9qZWN0Q29uZmlnKHRyZWUsIG9wdGlvbnMpO1xyXG4gIGNvbnN0IHBhdGhUb1N0b3JpZXNXaXRoaW5SZWFjdEV4YW1wbGVzID0gYCR7cmVhY3RFeGFtcGxlc0NvbmZpZy5yb290fS9zcmMvJHtvcHRpb25zLm5vcm1hbGl6ZWRQa2dOYW1lfWA7XHJcblxyXG4gIGNvbnN0IHN0b3J5UGF0aHM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gIHZpc2l0Tm90SWdub3JlZEZpbGVzKHRyZWUsIHBhdGhUb1N0b3JpZXNXaXRoaW5SZWFjdEV4YW1wbGVzLCB0cmVlUGF0aCA9PiB7XHJcbiAgICBpZiAodHJlZVBhdGguaW5jbHVkZXMoJy5zdG9yaWVzLicpKSB7XHJcbiAgICAgIHN0b3J5UGF0aHMucHVzaCh0cmVlUGF0aCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIGlmIChzdG9yeVBhdGhzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgdXNlckxvZy5wdXNoKHtcclxuICAgICAgdHlwZTogJ3dhcm4nLFxyXG4gICAgICBtZXNzYWdlOiAnTm8gcGFja2FnZSBzdG9yaWVzIGZvdW5kIHdpdGhpbiByZWFjdC1leGFtcGxlcy4gU2tpcHBpbmcgc3Rvcnlib29rIHN0b3JpZXMgbWlncmF0aW9uLi4uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0cmVlO1xyXG4gIH1cclxuXHJcbiAgc3RvcnlQYXRocy5mb3JFYWNoKG9yaWdpblBhdGggPT4ge1xyXG4gICAgY29uc3QgcGF0aFNlZ21lbnRzID0gc3BsaXRQYXRoRnJhZ21lbnRzKG9yaWdpblBhdGgpO1xyXG4gICAgY29uc3QgZmlsZU5hbWUgPSBwYXRoU2VnbWVudHNbcGF0aFNlZ21lbnRzLmxlbmd0aCAtIDFdO1xyXG4gICAgY29uc3QgY29tcG9uZW50TmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoL1xcLnN0b3JpZXNcXC50c3g/JC8sICcnKTtcclxuICAgIGxldCBjb250ZW50cyA9IHRyZWUucmVhZChvcmlnaW5QYXRoKT8udG9TdHJpbmcoJ3V0Zi04Jyk7XHJcblxyXG4gICAgaWYgKGNvbnRlbnRzKSB7XHJcbiAgICAgIGNvbnRlbnRzID0gY29udGVudHMucmVwbGFjZShvcHRpb25zLm5hbWUsICcuL2luZGV4Jyk7XHJcbiAgICAgIGNvbnRlbnRzID1cclxuICAgICAgICBjb250ZW50cyArXHJcbiAgICAgICAgJ1xcblxcbicgK1xyXG4gICAgICAgIHN0cmlwSW5kZW50c2BcclxuICAgICAgICBleHBvcnQgZGVmYXVsdCB7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnQ29tcG9uZW50cy8ke2NvbXBvbmVudE5hbWV9JyxcclxuICAgICAgICAgICAgY29tcG9uZW50OiAke2NvbXBvbmVudE5hbWV9LFxyXG4gICAgICAgIH1cclxuICAgICAgYDtcclxuXHJcbiAgICAgIHRyZWUud3JpdGUoam9pblBhdGhGcmFnbWVudHMob3B0aW9ucy5wcm9qZWN0Q29uZmlnLnJvb3QsICdzcmMnLCBmaWxlTmFtZSksIGNvbnRlbnRzKTtcclxuXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIG1vdmluZyAke2ZpbGVOYW1lfSBmcm9tIHJlYWN0LWV4YW1wbGVzYCk7XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB0cmVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRSZWFjdEV4YW1wbGVzUHJvamVjdENvbmZpZyh0cmVlOiBUcmVlLCBvcHRpb25zOiBOb3JtYWxpemVkU2NoZW1hKSB7XHJcbiAgcmV0dXJuIHJlYWRQcm9qZWN0Q29uZmlndXJhdGlvbih0cmVlLCBgQCR7b3B0aW9ucy53b3Jrc3BhY2VDb25maWcubnBtU2NvcGV9L3JlYWN0LWV4YW1wbGVzYCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZU1pZ3JhdGVkUGFja2FnZUZyb21SZWFjdEV4YW1wbGVzKHRyZWU6IFRyZWUsIG9wdGlvbnM6IE5vcm1hbGl6ZWRTY2hlbWEsIHVzZXJMb2c6IFVzZXJMb2cpIHtcclxuICBjb25zdCByZWFjdEV4YW1wbGVzQ29uZmlnID0gZ2V0UmVhY3RFeGFtcGxlc1Byb2plY3RDb25maWcodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gIGNvbnN0IHBhdGhzID0ge1xyXG4gICAgcGFja2FnZVN0b3JpZXNXaXRoaW5SZWFjdEV4YW1wbGVzOiBgJHtyZWFjdEV4YW1wbGVzQ29uZmlnLnJvb3R9L3NyYy8ke29wdGlvbnMubm9ybWFsaXplZFBrZ05hbWV9YCxcclxuICAgIHBhY2thZ2VKc29uOiBgJHtyZWFjdEV4YW1wbGVzQ29uZmlnLnJvb3R9L3BhY2thZ2UuanNvbmAsXHJcbiAgfTtcclxuXHJcbiAgaWYgKCF0cmVlLmV4aXN0cyhwYXRocy5wYWNrYWdlU3Rvcmllc1dpdGhpblJlYWN0RXhhbXBsZXMpKSB7XHJcbiAgICByZXR1cm4gdHJlZTtcclxuICB9XHJcblxyXG4gIHRyZWUuZGVsZXRlKHBhdGhzLnBhY2thZ2VTdG9yaWVzV2l0aGluUmVhY3RFeGFtcGxlcyk7XHJcblxyXG4gIHVzZXJMb2cucHVzaChcclxuICAgIHsgdHlwZTogJ3dhcm4nLCBtZXNzYWdlOiBgTk9URTogRGVsZXRpbmcgJHtyZWFjdEV4YW1wbGVzQ29uZmlnLnJvb3R9L3NyYy8ke29wdGlvbnMubm9ybWFsaXplZFBrZ05hbWV9YCB9LFxyXG4gICAgeyB0eXBlOiAnd2FybicsIG1lc3NhZ2U6IGAgICAgICAtIFBsZWFzZSB1cGRhdGUgeW91ciBtb3ZlZCBzdG9yaWVzIHRvIGZvbGxvdyBzdGFuZGFyZCBzdG9yeWJvb2sgZm9ybWF0XFxuYCB9LFxyXG4gICk7XHJcblxyXG4gIHVwZGF0ZUpzb24odHJlZSwgcGF0aHMucGFja2FnZUpzb24sIChqc29uOiBQYWNrYWdlSnNvbikgPT4ge1xyXG4gICAgaWYgKGpzb24uZGVwZW5kZW5jaWVzKSB7XHJcbiAgICAgIGRlbGV0ZSBqc29uLmRlcGVuZGVuY2llc1tvcHRpb25zLm5hbWVdO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBqc29uO1xyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gdHJlZTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlTG9jYWxKZXN0Q29uZmlnKHRyZWU6IFRyZWUsIG9wdGlvbnM6IE5vcm1hbGl6ZWRTY2hlbWEpIHtcclxuICB0cmVlLndyaXRlKG9wdGlvbnMucGF0aHMuamVzdENvbmZpZywgdGVtcGxhdGVzLmplc3QoeyBwa2dOYW1lOiBvcHRpb25zLm5vcm1hbGl6ZWRQa2dOYW1lIH0pKTtcclxuXHJcbiAgcmV0dXJuIHRyZWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVJvb3RKZXN0Q29uZmlnKHRyZWU6IFRyZWUsIG9wdGlvbnM6IE5vcm1hbGl6ZWRTY2hlbWEpIHtcclxuICB1cGRhdGVKZXN0Q29uZmlnKHRyZWUsIHsgcHJvamVjdDogb3B0aW9ucy5uYW1lIH0pO1xyXG5cclxuICByZXR1cm4gdHJlZTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlZExvY2FsVHNDb25maWcodHJlZTogVHJlZSwgb3B0aW9uczogTm9ybWFsaXplZFNjaGVtYSkge1xyXG4gIGNvbnN0IG5ld0NvbmZpZzogVHNDb25maWcgPSB7IC4uLnRlbXBsYXRlcy50c2NvbmZpZyB9O1xyXG4gIGNvbnN0IG9sZENvbmZpZyA9IHJlYWRKc29uPFRzQ29uZmlnPih0cmVlLCBvcHRpb25zLnBhdGhzLnRzY29uZmlnKTtcclxuXHJcbiAgY29uc3Qgb2xkQ29uZmlnVHlwZXMgPSBvbGRDb25maWcuY29tcGlsZXJPcHRpb25zLnR5cGVzID8/IFtdO1xyXG4gIGNvbnN0IG5ld0NvbmZpZ1R5cGVzID0gbmV3Q29uZmlnLmNvbXBpbGVyT3B0aW9ucy50eXBlcyA/PyBbXTtcclxuICBjb25zdCB1cGRhdGVkVHlwZXMgPSB1bmlxdWVBcnJheShbLi4ubmV3Q29uZmlnVHlwZXMsIC4uLm9sZENvbmZpZ1R5cGVzXSk7XHJcblxyXG4gIG5ld0NvbmZpZy5jb21waWxlck9wdGlvbnMudHlwZXMgPSB1cGRhdGVkVHlwZXM7XHJcblxyXG4gIHRyZWUud3JpdGUob3B0aW9ucy5wYXRocy50c2NvbmZpZywgc2VyaWFsaXplSnNvbihuZXdDb25maWcpKTtcclxuXHJcbiAgcmV0dXJuIHRyZWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZWRCYXNlVHNDb25maWcodHJlZTogVHJlZSwgb3B0aW9uczogTm9ybWFsaXplZFNjaGVtYSkge1xyXG4gIGNvbnN0IHdvcmtzcGFjZUNvbmZpZyA9IHJlYWRXb3Jrc3BhY2VDb25maWd1cmF0aW9uKHRyZWUpO1xyXG4gIGNvbnN0IGFsbFByb2plY3RzID0gZ2V0UHJvamVjdHModHJlZSk7XHJcblxyXG4gIGNvbnN0IHByb2plY3RQa2dKc29uID0gcmVhZEpzb248UGFja2FnZUpzb24+KHRyZWUsIG9wdGlvbnMucGF0aHMucGFja2FnZUpzb24pO1xyXG5cclxuICBjb25zdCBkZXBzVGhhdE5lZWRUb0JlY29tZUFsaWFzZXMgPSBPYmplY3Qua2V5cyhwcm9qZWN0UGtnSnNvbi5kZXBlbmRlbmNpZXMgPz8ge30pXHJcbiAgICAuZmlsdGVyKHBrZ05hbWUgPT4gcGtnTmFtZS5zdGFydHNXaXRoKGBAJHt3b3Jrc3BhY2VDb25maWcubnBtU2NvcGV9YCkpXHJcbiAgICAucmVkdWNlKChhY2MsIHBrZ05hbWUpID0+IHtcclxuICAgICAgYWNjW3BrZ05hbWVdID0gW2Ake2FsbFByb2plY3RzLmdldChwa2dOYW1lKT8ucm9vdH0vc3JjL2luZGV4LnRzYF07XHJcblxyXG4gICAgICByZXR1cm4gYWNjO1xyXG4gICAgfSwge30gYXMgUmVxdWlyZWQ8UGljazxUc0NvbmZpZ1snY29tcGlsZXJPcHRpb25zJ10sICdwYXRocyc+PlsncGF0aHMnXSk7XHJcblxyXG4gIHVwZGF0ZUpzb248VHNDb25maWcsIFRzQ29uZmlnPih0cmVlLCBvcHRpb25zLnBhdGhzLnJvb3RUc2NvbmZpZywganNvbiA9PiB7XHJcbiAgICBqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocyA9IGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzID8/IHt9O1xyXG4gICAganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbb3B0aW9ucy5uYW1lXSA9IFtgJHtvcHRpb25zLnByb2plY3RDb25maWcucm9vdH0vc3JjL2luZGV4LnRzYF07XHJcblxyXG4gICAgT2JqZWN0LmFzc2lnbihqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocywgZGVwc1RoYXROZWVkVG9CZWNvbWVBbGlhc2VzKTtcclxuXHJcbiAgICByZXR1cm4ganNvbjtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gcHJpbnRVc2VyTG9ncyhsb2dzOiBVc2VyTG9nKSB7XHJcbiAgbG9nZ2VyLmxvZyhgJHsnPScucmVwZWF0KDgwKX1cXG5gKTtcclxuXHJcbiAgbG9ncy5mb3JFYWNoKGxvZyA9PiBsb2dnZXJbbG9nLnR5cGVdKGxvZy5tZXNzYWdlKSk7XHJcblxyXG4gIGxvZ2dlci5sb2coYCR7Jz0nLnJlcGVhdCg4MCl9XFxuYCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNwbGl0UGF0aEZyYWdtZW50cyhmaWxlUGF0aDogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIGZpbGVQYXRoLnNwbGl0KHBhdGguc2VwKTtcclxufVxyXG4iXSwidmVyc2lvbiI6M30=
