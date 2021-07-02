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
const testing_1 = require('@nrwl/devkit/testing');
const devkit_1 = require('@nrwl/devkit');
const index_1 = require('./index');
describe('workspace-generator generator', () => {
  let tree;
  const options = { name: 'custom' };
  beforeEach(() => {
    tree = testing_1.createTreeWithEmptyWorkspace();
  });
  it('should generate boilerplate', () =>
    __awaiter(void 0, void 0, void 0, function*() {
      yield index_1.default(tree, options);
      expect(tree.exists('/tools/generators/custom/index.ts')).toBeTruthy();
      expect(tree.exists('/tools/generators/custom/index.spec.ts')).toBeTruthy();
      expect(tree.exists('/tools/generators/custom/schema.json')).toBeTruthy();
      expect(tree.exists('/tools/generators/custom/schema.ts')).toBeTruthy();
    }));
  it('should generate Schema types', () =>
    __awaiter(void 0, void 0, void 0, function*() {
      var _a;
      yield index_1.default(tree, options);
      const content =
        (_a = tree.read('/tools/generators/custom/schema.ts')) === null || _a === void 0 ? void 0 : _a.toString();
      expect(content).toMatchInlineSnapshot(`
      "export interface CustomGeneratorSchema {
        /**
         * Library name
         */
        name: string;
      }
      "
    `);
    }));
  it('should generate Schema', () =>
    __awaiter(void 0, void 0, void 0, function*() {
      yield index_1.default(tree, options);
      const content = devkit_1.readJson(tree, '/tools/generators/custom/schema.json');
      expect(content.id).toEqual('custom');
    }));
  it('should generate implementation boilerplate', () =>
    __awaiter(void 0, void 0, void 0, function*() {
      var _b;
      yield index_1.default(tree, options);
      const content =
        (_b = tree.read('/tools/generators/custom/index.ts')) === null || _b === void 0 ? void 0 : _b.toString();
      expect(content).toMatchInlineSnapshot(`
      "import { Tree, formatFiles, installPackagesTask } from '@nrwl/devkit';
      import { libraryGenerator } from '@nrwl/workspace/generators';

      import { CustomGeneratorSchema } from './schema'

      export default async function(host: Tree, schema: CustomGeneratorSchema) {
        await libraryGenerator(host, {name: schema.name});
        await formatFiles(host);
        return () => {
          installPackagesTask(host)
        }
      }
      "
    `);
    }));
  it('should generate testing boilerplate', () =>
    __awaiter(void 0, void 0, void 0, function*() {
      var _c;
      yield index_1.default(tree, options);
      const content =
        (_c = tree.read('/tools/generators/custom/index.spec.ts')) === null || _c === void 0 ? void 0 : _c.toString();
      expect(content).toMatchInlineSnapshot(`
      "import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
      import { Tree, readProjectConfiguration } from '@nrwl/devkit';

      import generator from './index';
      import { CustomGeneratorSchema } from './schema';

      describe('custom generator', () => {
        let appTree: Tree;
        const options: CustomGeneratorSchema = { name: 'test' };

        beforeEach(() => {
          appTree = createTreeWithEmptyWorkspace();
        });

        it('should run successfully', async () => {
          await generator(appTree, options);
          const config = readProjectConfiguration(appTree, 'test');
          expect(config).toBeDefined();
        })
      });
      "
    `);
    }));
  it(`should throw when required props are missing`, () =>
    __awaiter(void 0, void 0, void 0, function*() {
      expect(index_1.default(tree, { name: '' })).rejects.toMatchInlineSnapshot(`[Error: name is required]`);
    }));
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJmaWxlIjoiQzpcXFVzZXJzXFxjemVhclxcRG9jdW1lbnRzXFxmbHVlbnR1aVxcdG9vbHNcXGdlbmVyYXRvcnNcXHdvcmtzcGFjZS1nZW5lcmF0b3JcXGluZGV4LnNwZWMudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxrREFBb0U7QUFDcEUseUNBQThDO0FBRTlDLG1DQUFnQztBQUdoQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO0lBQzdDLElBQUksSUFBVSxDQUFDO0lBQ2YsTUFBTSxPQUFPLEdBQXNDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO0lBRXRFLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxJQUFJLEdBQUcsc0NBQTRCLEVBQUUsQ0FBQztJQUN4QyxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw2QkFBNkIsRUFBRSxHQUFTLEVBQUU7UUFDM0MsTUFBTSxlQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRS9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUN0RSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDM0UsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsc0NBQXNDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUN6RSxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDhCQUE4QixFQUFFLEdBQVMsRUFBRTs7UUFDNUMsTUFBTSxlQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRS9CLE1BQU0sT0FBTyxTQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsMENBQUUsUUFBUSxFQUFFLENBQUM7UUFFNUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLHFCQUFxQixDQUFDOzs7Ozs7OztLQVFyQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHdCQUF3QixFQUFFLEdBQVMsRUFBRTtRQUN0QyxNQUFNLGVBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFL0IsTUFBTSxPQUFPLEdBQUcsaUJBQVEsQ0FBQyxJQUFJLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztRQUV2RSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDRDQUE0QyxFQUFFLEdBQVMsRUFBRTs7UUFDMUQsTUFBTSxlQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRS9CLE1BQU0sT0FBTyxTQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsbUNBQW1DLENBQUMsMENBQUUsUUFBUSxFQUFFLENBQUM7UUFFM0UsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLHFCQUFxQixDQUFDOzs7Ozs7Ozs7Ozs7OztLQWNyQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHFDQUFxQyxFQUFFLEdBQVMsRUFBRTs7UUFDbkQsTUFBTSxlQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRS9CLE1BQU0sT0FBTyxTQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsd0NBQXdDLENBQUMsMENBQUUsUUFBUSxFQUFFLENBQUM7UUFFaEYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLHFCQUFxQixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0tBc0JyQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEdBQVMsRUFBRTtRQUM1RCxNQUFNLENBQUMsZUFBUyxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFDbkcsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcY3plYXJcXERvY3VtZW50c1xcZmx1ZW50dWlcXHRvb2xzXFxnZW5lcmF0b3JzXFx3b3Jrc3BhY2UtZ2VuZXJhdG9yXFxpbmRleC5zcGVjLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVRyZWVXaXRoRW1wdHlXb3Jrc3BhY2UgfSBmcm9tICdAbnJ3bC9kZXZraXQvdGVzdGluZyc7XHJcbmltcG9ydCB7IFRyZWUsIHJlYWRKc29uIH0gZnJvbSAnQG5yd2wvZGV2a2l0JztcclxuXHJcbmltcG9ydCBnZW5lcmF0b3IgZnJvbSAnLi9pbmRleCc7XHJcbmltcG9ydCB7IFdvcmtzcGFjZUdlbmVyYXRvckdlbmVyYXRvclNjaGVtYSB9IGZyb20gJy4vc2NoZW1hJztcclxuXHJcbmRlc2NyaWJlKCd3b3Jrc3BhY2UtZ2VuZXJhdG9yIGdlbmVyYXRvcicsICgpID0+IHtcclxuICBsZXQgdHJlZTogVHJlZTtcclxuICBjb25zdCBvcHRpb25zOiBXb3Jrc3BhY2VHZW5lcmF0b3JHZW5lcmF0b3JTY2hlbWEgPSB7IG5hbWU6ICdjdXN0b20nIH07XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgdHJlZSA9IGNyZWF0ZVRyZWVXaXRoRW1wdHlXb3Jrc3BhY2UoKTtcclxuICB9KTtcclxuXHJcbiAgaXQoJ3Nob3VsZCBnZW5lcmF0ZSBib2lsZXJwbGF0ZScsIGFzeW5jICgpID0+IHtcclxuICAgIGF3YWl0IGdlbmVyYXRvcih0cmVlLCBvcHRpb25zKTtcclxuXHJcbiAgICBleHBlY3QodHJlZS5leGlzdHMoJy90b29scy9nZW5lcmF0b3JzL2N1c3RvbS9pbmRleC50cycpKS50b0JlVHJ1dGh5KCk7XHJcbiAgICBleHBlY3QodHJlZS5leGlzdHMoJy90b29scy9nZW5lcmF0b3JzL2N1c3RvbS9pbmRleC5zcGVjLnRzJykpLnRvQmVUcnV0aHkoKTtcclxuICAgIGV4cGVjdCh0cmVlLmV4aXN0cygnL3Rvb2xzL2dlbmVyYXRvcnMvY3VzdG9tL3NjaGVtYS5qc29uJykpLnRvQmVUcnV0aHkoKTtcclxuICAgIGV4cGVjdCh0cmVlLmV4aXN0cygnL3Rvb2xzL2dlbmVyYXRvcnMvY3VzdG9tL3NjaGVtYS50cycpKS50b0JlVHJ1dGh5KCk7XHJcbiAgfSk7XHJcblxyXG4gIGl0KCdzaG91bGQgZ2VuZXJhdGUgU2NoZW1hIHR5cGVzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgIGNvbnN0IGNvbnRlbnQgPSB0cmVlLnJlYWQoJy90b29scy9nZW5lcmF0b3JzL2N1c3RvbS9zY2hlbWEudHMnKT8udG9TdHJpbmcoKTtcclxuXHJcbiAgICBleHBlY3QoY29udGVudCkudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuICAgICAgXCJleHBvcnQgaW50ZXJmYWNlIEN1c3RvbUdlbmVyYXRvclNjaGVtYSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogTGlicmFyeSBuYW1lXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgbmFtZTogc3RyaW5nO1xyXG4gICAgICB9XHJcbiAgICAgIFwiXHJcbiAgICBgKTtcclxuICB9KTtcclxuXHJcbiAgaXQoJ3Nob3VsZCBnZW5lcmF0ZSBTY2hlbWEnLCBhc3luYyAoKSA9PiB7XHJcbiAgICBhd2FpdCBnZW5lcmF0b3IodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgY29uc3QgY29udGVudCA9IHJlYWRKc29uKHRyZWUsICcvdG9vbHMvZ2VuZXJhdG9ycy9jdXN0b20vc2NoZW1hLmpzb24nKTtcclxuXHJcbiAgICBleHBlY3QoY29udGVudC5pZCkudG9FcXVhbCgnY3VzdG9tJyk7XHJcbiAgfSk7XHJcblxyXG4gIGl0KCdzaG91bGQgZ2VuZXJhdGUgaW1wbGVtZW50YXRpb24gYm9pbGVycGxhdGUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICBhd2FpdCBnZW5lcmF0b3IodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgY29uc3QgY29udGVudCA9IHRyZWUucmVhZCgnL3Rvb2xzL2dlbmVyYXRvcnMvY3VzdG9tL2luZGV4LnRzJyk/LnRvU3RyaW5nKCk7XHJcblxyXG4gICAgZXhwZWN0KGNvbnRlbnQpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXHJcbiAgICAgIFwiaW1wb3J0IHsgVHJlZSwgZm9ybWF0RmlsZXMsIGluc3RhbGxQYWNrYWdlc1Rhc2sgfSBmcm9tICdAbnJ3bC9kZXZraXQnO1xyXG4gICAgICBpbXBvcnQgeyBsaWJyYXJ5R2VuZXJhdG9yIH0gZnJvbSAnQG5yd2wvd29ya3NwYWNlL2dlbmVyYXRvcnMnO1xyXG5cclxuICAgICAgaW1wb3J0IHsgQ3VzdG9tR2VuZXJhdG9yU2NoZW1hIH0gZnJvbSAnLi9zY2hlbWEnXHJcblxyXG4gICAgICBleHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihob3N0OiBUcmVlLCBzY2hlbWE6IEN1c3RvbUdlbmVyYXRvclNjaGVtYSkge1xyXG4gICAgICAgIGF3YWl0IGxpYnJhcnlHZW5lcmF0b3IoaG9zdCwge25hbWU6IHNjaGVtYS5uYW1lfSk7XHJcbiAgICAgICAgYXdhaXQgZm9ybWF0RmlsZXMoaG9zdCk7XHJcbiAgICAgICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICAgIGluc3RhbGxQYWNrYWdlc1Rhc2soaG9zdClcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXCJcclxuICAgIGApO1xyXG4gIH0pO1xyXG5cclxuICBpdCgnc2hvdWxkIGdlbmVyYXRlIHRlc3RpbmcgYm9pbGVycGxhdGUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICBhd2FpdCBnZW5lcmF0b3IodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgY29uc3QgY29udGVudCA9IHRyZWUucmVhZCgnL3Rvb2xzL2dlbmVyYXRvcnMvY3VzdG9tL2luZGV4LnNwZWMudHMnKT8udG9TdHJpbmcoKTtcclxuXHJcbiAgICBleHBlY3QoY29udGVudCkudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuICAgICAgXCJpbXBvcnQgeyBjcmVhdGVUcmVlV2l0aEVtcHR5V29ya3NwYWNlIH0gZnJvbSAnQG5yd2wvZGV2a2l0L3Rlc3RpbmcnO1xyXG4gICAgICBpbXBvcnQgeyBUcmVlLCByZWFkUHJvamVjdENvbmZpZ3VyYXRpb24gfSBmcm9tICdAbnJ3bC9kZXZraXQnO1xyXG5cclxuICAgICAgaW1wb3J0IGdlbmVyYXRvciBmcm9tICcuL2luZGV4JztcclxuICAgICAgaW1wb3J0IHsgQ3VzdG9tR2VuZXJhdG9yU2NoZW1hIH0gZnJvbSAnLi9zY2hlbWEnO1xyXG5cclxuICAgICAgZGVzY3JpYmUoJ2N1c3RvbSBnZW5lcmF0b3InLCAoKSA9PiB7XHJcbiAgICAgICAgbGV0IGFwcFRyZWU6IFRyZWU7XHJcbiAgICAgICAgY29uc3Qgb3B0aW9uczogQ3VzdG9tR2VuZXJhdG9yU2NoZW1hID0geyBuYW1lOiAndGVzdCcgfTtcclxuXHJcbiAgICAgICAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICAgICAgICBhcHBUcmVlID0gY3JlYXRlVHJlZVdpdGhFbXB0eVdvcmtzcGFjZSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpdCgnc2hvdWxkIHJ1biBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICBhd2FpdCBnZW5lcmF0b3IoYXBwVHJlZSwgb3B0aW9ucyk7XHJcbiAgICAgICAgICBjb25zdCBjb25maWcgPSByZWFkUHJvamVjdENvbmZpZ3VyYXRpb24oYXBwVHJlZSwgJ3Rlc3QnKTtcclxuICAgICAgICAgIGV4cGVjdChjb25maWcpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgfSlcclxuICAgICAgfSk7XHJcbiAgICAgIFwiXHJcbiAgICBgKTtcclxuICB9KTtcclxuXHJcbiAgaXQoYHNob3VsZCB0aHJvdyB3aGVuIHJlcXVpcmVkIHByb3BzIGFyZSBtaXNzaW5nYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgZXhwZWN0KGdlbmVyYXRvcih0cmVlLCB7IG5hbWU6ICcnIH0pKS5yZWplY3RzLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgW0Vycm9yOiBuYW1lIGlzIHJlcXVpcmVkXWApO1xyXG4gIH0pO1xyXG59KTtcclxuIl0sInZlcnNpb24iOjN9
