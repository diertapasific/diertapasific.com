"""Save the author's public Medium text editions for the desk's reading surfaces."""
import argparse
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path

ARTICLES = {'9409db920cac': '01', '61b5e675595d': '02', 'f0385585c924': '03', 'adabc083be6d': '04', 'a9afd35141a3': 'chatdp', '48098b2048c4': 'mobile-development'}
VOID = {'img', 'br', 'hr', 'input', 'meta', 'link'}


def clean(text):
    return re.sub('[\U0001f000-\U0001ffff\u2600-\u27bf\ufe0f\ufe0e\u200d]', '', text).replace('\xa0', ' ')


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {'tag': 'root', 'children': []}
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'children': []}
        self.stack[-1]['children'].append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index]['tag'] == tag:
                self.stack = self.stack[:index]
                return

    def handle_data(self, data):
        self.stack[-1]['children'].append(data)


def text_only(node):
    if isinstance(node, str):
        return clean(node)
    return ('\n' if node['tag'] == 'br' else '') + ''.join(text_only(child) for child in node['children'])


def markdown(node):
    if isinstance(node, str):
        return clean(node)
    tag = node['tag']
    if tag in {'figure', 'figcaption', 'img', 'script', 'style'}:
        return ''
    if tag == 'pre':
        return '\n\n```\n' + text_only(node).strip() + '\n```\n\n'
    body = ''.join(markdown(child) for child in node['children'])
    if tag in {'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}:
        return '\n\n' + ('## ' if tag in {'h1', 'h2', 'h3'} else '### ') + body.replace('**', '').strip() + '\n\n'
    if tag == 'p':
        return '\n\n' + body.strip() + '\n\n'
    if tag == 'br':
        return '\n'
    if tag == 'blockquote':
        return '\n\n' + '\n'.join('> ' + line for line in body.strip().splitlines()) + '\n\n'
    if tag in {'ul', 'ol'}:
        items = [child for child in node['children'] if isinstance(child, dict) and child['tag'] == 'li']
        return '\n\n' + '\n'.join((f'{index + 1}. ' if tag == 'ol' else '- ') + ''.join(markdown(child) for child in item['children']).strip() for index, item in enumerate(items)) + '\n\n'
    if tag in {'strong', 'b'}:
        return '**' + body + '**'
    if tag in {'em', 'i'}:
        return '*' + body + '*'
    if tag == 'code':
        return '`' + body + '`'
    if tag == 'a':
        href = node['attrs'].get('href', '')
        return '[' + body + '](' + href + ')' if urllib.parse.urlsplit(href).scheme in {'http', 'https'} else body
    return body


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--feed', help='Use an already downloaded public RSS feed')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'src/desk/data/medium-articles.json')
    args = parser.parse_args()
    if args.feed:
        raw = Path(args.feed).read_bytes()
    else:
        request = urllib.request.Request('https://medium.com/feed/@diertapasific', headers={'User-Agent': 'Portfolio-Local-Preview'})
        with urllib.request.urlopen(request, timeout=25) as response:
            raw = response.read()
    articles = {}
    for item in ET.fromstring(raw).findall('./channel/item'):
        url = item.findtext('link').split('?')[0]
        project = ARTICLES.get(url.rsplit('-', 1)[-1])
        if not project:
            continue
        tree = Tree()
        tree.feed(item.findtext('{http://purl.org/rss/1.0/modules/content/}encoded') or '')
        body = re.sub(r'\n{3,}', '\n\n', markdown(tree.root)).strip()
        if len(body) < 200:
            raise ValueError(f'Article text was incomplete for {url}')
        articles[project] = {
            'title': clean(item.findtext('title')),
            'author': item.findtext('{http://purl.org/dc/elements/1.1/}creator'),
            'publishedAt': parsedate_to_datetime(item.findtext('pubDate')).isoformat(),
            'url': url,
            'markdown': body,
        }
    if set(articles) != set(ARTICLES.values()):
        raise ValueError('The feed did not contain every expected article; existing data was not replaced.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(articles, ensure_ascii=False, indent=2) + '\n')
    print(f'Saved {len(articles)} article text editions to {args.output}')


if __name__ == '__main__':
    main()
