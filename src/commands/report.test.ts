import { describe, it, expect } from 'vitest';
import { escape } from './report';

describe('escape', () => {
  it('should escape a basic string', () => {
    expect(escape('hello < world')).toBe('hello &lt; world');
  });

  it('should escape all special HTML characters', () => {
    expect(escape('& < > " \'')).toBe('&amp; &lt; &gt; &quot; &#39;');
  });

  it('should handle an empty string', () => {
    expect(escape('')).toBe('');
  });

  it('should handle strings with no special characters', () => {
    expect(escape('hello world 123')).toBe('hello world 123');
  });

  it('should escape multiple instances of the same character', () => {
    expect(escape('<<< >>> &&& """ \'\'\'')).toBe(
      '&lt;&lt;&lt; &gt;&gt;&gt; &amp;&amp;&amp; &quot;&quot;&quot; &#39;&#39;&#39;'
    );
  });

  it('should handle non-string inputs by stringifying them', () => {
    expect(escape(123 as any)).toBe('123');
    expect(escape(null as any)).toBe('null');
    expect(escape(undefined as any)).toBe('undefined');
    expect(escape({} as any)).toBe('[object Object]');
    expect(escape(false as any)).toBe('false');
  });

  it('should handle complex mixed strings', () => {
    const input = `<div class="test" id='main'>Foo & Bar</div>`;
    const expected = `&lt;div class=&quot;test&quot; id=&#39;main&#39;&gt;Foo &amp; Bar&lt;/div&gt;`;
    expect(escape(input)).toBe(expected);
  });
});
