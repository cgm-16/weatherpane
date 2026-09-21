import type { Rule } from 'eslint';

const technicalTokens = new Set([
  'Weatherpane',
  'API',
  'AQI',
  'URL',
  'H',
  'L',
  'CONNECTION_FAILED',
]);
const iconTokens = new Set([
  'home',
  'search',
  'favorite',
  'settings',
  'schedule',
  'drag_handle',
  'keyboard_arrow_up',
  'keyboard_arrow_down',
  'my_location',
  'error',
  'key',
  'signal_disconnected',
  'refresh',
  'bookmarks',
  'air',
  'humidity_percentage',
  'close',
  'arrow_back',
  'dew_point',
  'wb_sunny',
  'cloud_off',
  'location_off',
]);

type Expression = Extract<
  Rule.Node,
  { type: 'ExpressionStatement' }
>['expression'];

// ESLint의 기본 ESTree 타입에는 JSX 확장이 없어 방문 노드의 형태만 명시합니다.
type JSXTextNode = Rule.Node & {
  value: string;
  parent: Rule.Node & {
    openingElement?: {
      attributes: Array<{
        type: string;
        name?: { name: string };
        value?:
          | Expression
          | { type: 'JSXExpressionContainer'; expression: Expression };
      }>;
    };
  };
};

function hasIconClass(expression: Expression): boolean {
  if (expression.type === 'Literal') {
    return (
      typeof expression.value === 'string' &&
      expression.value.split(/\s+/).includes('material-symbols-outlined')
    );
  }
  // 기존 배열 조합에서는 직접 넣은 문자열만 모든 분기에 포함됩니다.
  return (
    expression.type === 'CallExpression' &&
    expression.callee.type === 'MemberExpression' &&
    !expression.callee.computed &&
    expression.callee.property.type === 'Identifier' &&
    expression.callee.property.name === 'join' &&
    expression.arguments.length === 1 &&
    expression.arguments[0].type === 'Literal' &&
    expression.arguments[0].value === ' ' &&
    expression.callee.object.type === 'ArrayExpression' &&
    expression.callee.object.elements.some(
      (element) => element?.type === 'Literal' && hasIconClass(element)
    )
  );
}

const koreanJsxText: Rule.RuleModule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      englishCopy: 'JSX 텍스트의 영문 문구를 한국어로 작성해 주세요: {{text}}',
    },
  },
  create(context) {
    return {
      JSXText(node: Rule.Node) {
        const textNode = node as JSXTextNode;
        const text = textNode.value.trim();
        const isIcon = textNode.parent.openingElement?.attributes.some(
          (attribute) =>
            attribute.type === 'JSXAttribute' &&
            attribute.name?.name === 'className' &&
            attribute.value &&
            hasIconClass(
              attribute.value.type === 'JSXExpressionContainer'
                ? attribute.value.expression
                : attribute.value
            )
        );
        if (isIcon && iconTokens.has(text)) return;
        const tokens = text.match(/[A-Za-z][A-Za-z0-9_]*/g) ?? [];
        if (tokens.some((token) => !technicalTokens.has(token))) {
          context.report({
            node,
            loc: context.sourceCode.getLocFromIndex(
              node.range![0] + context.sourceCode.getText(node).search(/\S/)
            ),
            messageId: 'englishCopy',
            data: { text },
          });
        }
      },
    };
  },
};

export default koreanJsxText;
