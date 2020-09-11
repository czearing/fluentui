import * as React from 'react';
import * as ReactTestUtils from 'react-dom/test-utils';
import { TeachingBubble } from './TeachingBubble';
import { TeachingBubbleContent } from './TeachingBubbleContent';
import { mount } from 'enzyme';
import * as path from 'path';
import { isConformant } from '../../common/isConformant';

describe('TeachingBubble', () => {
  it('renders TeachingBubble using a <div> for the child content if the child is not a string', () => {
    const component = mount(
      <TeachingBubble
        isWide={true}
        calloutProps={{ doNotLayer: true, className: 'specialClassName' }}
        ariaDescribedBy="content"
      >
        <div>Not a string child</div>
      </TeachingBubble>,
    );

    expect(component.find(TeachingBubbleContent).find('div#content').length).toBe(1);
  });

  it('renders TeachingBubble using a <p> for the child content if the child is a string', () => {
    const component = mount(
      <TeachingBubble
        isWide={true}
        calloutProps={{ doNotLayer: true, className: 'specialClassName' }}
        ariaDescribedBy="content"
      >
        Not a string child
      </TeachingBubble>,
    );

    expect(component.find(TeachingBubbleContent).find('p#content').length).toBe(1);
  });

  isConformant({
    Component: TeachingBubble,
    displayName: 'TeachingBubble',
    componentPath: path.join(__dirname, 'TeachingBubble.ts'),
    snapshots: [
      {
        render: (
          <TeachingBubble isWide={true} calloutProps={{ doNotLayer: true, className: 'specialClassName' }}>
            Test Content
          </TeachingBubble>
        ),
      },
      {
        componentName: 'TeachingBubbleContent',
        render: <TeachingBubbleContent headline="Test Title">Content</TeachingBubbleContent>,
      },
      {
        componentName: 'TeachingBubbleContent',
        description: 'buttons',
        render: (
          <TeachingBubbleContent
            headline="Test Title"
            hasCloseButton={true}
            primaryButtonProps={{ children: 'Test Primary Button', className: 'primary-className' }}
            secondaryButtonProps={{ children: 'Test Secondary Button', className: 'secondary-className' }}
          >
            Content
          </TeachingBubbleContent>
        ),
      },
      {
        componentName: 'TeachingBubbleContent',
        description: 'illustrationImage',
        render: (
          <TeachingBubbleContent headline="Test Title" illustrationImage={{ src: 'test image url' }}>
            Content
          </TeachingBubbleContent>
        ),
      },
      {
        componentName: 'TeachingBubbleContent',
        description: 'hasCondensedHeadline',
        render: (
          <TeachingBubbleContent hasCondensedHeadline={true} headline="Test Title">
            Content
          </TeachingBubbleContent>
        ),
      },

      {
        componentName: 'TeachingBubbleContent',
        description: 'hasSmallHeadline',
        render: (
          <TeachingBubbleContent hasSmallHeadline={true} headline="Test Title">
            Content
          </TeachingBubbleContent>
        ),
      },
      {
        componentName: 'TeachingBubbleContent',
        description: 'footerContent',
        render: <TeachingBubbleContent footerContent="1 of 2">Content</TeachingBubbleContent>,
      },
      {
        componentName: 'TeachingBubbleContent',
        description: 'calloutProps',
        render: (
          <TeachingBubbleContent calloutProps={{ beakWidth: 50, calloutWidth: 100 }}>Content</TeachingBubbleContent>
        ),
      },
    ],
  });

  it('merges callout classNames', () => {
    ReactTestUtils.renderIntoDocument(<TeachingBubbleContent headline="Title" calloutProps={{ className: 'foo' }} />);
    setTimeout(() => {
      const callout = document.querySelector('.ms-Callout') as HTMLElement;
      expect(callout).toBeDefined();
      expect(callout.classList.contains('ms-TeachingBubble')).toBeTruthy();
      expect(callout.classList.contains('foo')).toBeTruthy();
    }, 0);
  });
});
