import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BlogContent from './BlogContent';

/**
 * R-03 — tests the actual rendering boundary (`dangerouslySetInnerHTML`):
 * malicious stored HTML must reach the DOM already neutralized, while
 * legitimate editor formatting must survive the trip.
 */
describe('BlogContent (rendering boundary)', () => {
  it('renders stored <script> payloads without ever creating a script node', () => {
    const { container } = render(<BlogContent html={'<p>hi</p><script>alert(1)</script>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('<script');
    expect(container.innerHTML).not.toContain('alert(1)');
    expect(container.textContent).toContain('hi');
  });

  it('renders <img onerror> without the handler attribute', () => {
    const { container } = render(<BlogContent html={'<img src="x" onerror="alert(1)">'} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('onerror')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(container.innerHTML).not.toContain('alert(1)');
  });

  it('renders javascript: links without a javascript: href', () => {
    const { container } = render(
      <BlogContent html={'<a href="javascript:alert(1)">click</a>'} />,
    );
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a!.getAttribute('href')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
    expect(a!.textContent).toBe('click');
  });

  it('keeps legitimate rich text intact', () => {
    const legit =
      '<h2>Hello</h2><p><strong>Bold</strong> text</p><ul><li>Item</li></ul>' +
      '<a href="https://example.com">Safe link</a>';
    const { container } = render(<BlogContent html={legit} />);

    expect(container.querySelector('h2')?.textContent).toBe('Hello');
    expect(container.querySelector('strong')?.textContent).toBe('Bold');
    expect(container.querySelector('li')?.textContent).toBe('Item');
    const a = container.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://example.com');
    expect(a?.textContent).toBe('Safe link');
    expect(container.querySelector('p')?.textContent).toContain('text');
  });

  it('does not create nodes for dangerous elements', () => {
    const { container } = render(
      <BlogContent
        html={'<iframe src="https://evil.test"></iframe><div onclick="alert(1)">x</div>'}
      />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    const div = container.querySelector('div.blog-content div');
    expect(div).not.toBeNull();
    expect(div!.getAttribute('onclick')).toBeNull();
    expect(container.innerHTML).not.toContain('alert');
  });
});
