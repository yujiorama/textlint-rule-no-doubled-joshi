// LICENSE : MIT
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (context) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var helper = new _textlintRuleHelper.RuleHelper(context);
    // 最低間隔値
    var minInterval = options.min_interval || defaultOptions.min_interval;
    var isStrict = options.strict || defaultOptions.strict;
    var allow = options.allow || defaultOptions.allow;
    var charRegExp = options.charRegExp || defaultOptions.charRegExp;
    var Syntax = context.Syntax,
        report = context.report,
        getSource = context.getSource,
        RuleError = context.RuleError;

    return _defineProperty({}, Syntax.Paragraph, function (node) {
        if (helper.isChildNode(node, [Syntax.Link, Syntax.Image, Syntax.BlockQuote, Syntax.Emphasis])) {
            return;
        }
        var source = new _textlintUtilToString2.default(node);
        var text = source.toString();
        var isSentenceNode = function isSentenceNode(node) {
            return node.type === _sentenceSplitter.Syntax.Sentence;
        };
        var sentences = (0, _sentenceSplitter.split)(text, {
            charRegExp: charRegExp
        }).filter(isSentenceNode);
        return (0, _kuromojin.getTokenizer)().then(function (tokenizer) {
            var checkSentence = function checkSentence(sentence) {
                var tokens = tokenizer.tokenizeForSentence(sentence.raw);
                var countableTokens = tokens.filter(function (token) {
                    if (isStrict) {
                        return (0, _tokenUtils.is助詞Token)(token);
                    }
                    // デフォルトでは、"、"を間隔値の距離としてカウントする
                    // "、" があると助詞同士の距離が開くようにすることで、並列的な"、"の使い方を許容する目的
                    // https://github.com/azu/textlint-rule-no-doubled-joshi/issues/2
                    return (0, _tokenUtils.is助詞Token)(token) || (0, _tokenUtils.is読点Token)(token);
                });
                var joshiTokenSurfaceKeyMap = createSurfaceKeyMap(countableTokens);
                /*
                 # Data Structure
                  joshiTokens = [tokenA, tokenB, tokenC, tokenD, tokenE, tokenF]
                 joshiTokenSurfaceKeyMap = {
                 "は:助詞.係助詞": [tokenA, tokenC, tokenE],
                 "で:助詞.係助詞": [tokenB, tokenD, tokenF]
                 }
                 */
                Object.keys(joshiTokenSurfaceKeyMap).forEach(function (key) {
                    var tokens = joshiTokenSurfaceKeyMap[key];
                    var joshiName = (0, _tokenUtils.restoreToSurfaceFromKey)(key);
                    // check allow
                    if (allow.indexOf(joshiName) >= 0) {
                        return;
                    }
                    // strict mode ではない時例外を除去する
                    if (!isStrict) {
                        if (matchExceptionRule(tokens)) {
                            return;
                        }
                    }
                    if (tokens.length <= 1) {
                        return; // no duplicated token
                    }
                    // if found differenceIndex less than
                    // tokes are sorted ascending order
                    tokens.reduce(function (prev, current) {
                        var startPosition = countableTokens.indexOf(prev);
                        var otherPosition = countableTokens.indexOf(current);
                        // 助詞token同士の距離が設定値以下ならエラーを報告する
                        var differenceIndex = otherPosition - startPosition;
                        if (differenceIndex <= minInterval) {
                            var originalIndex = source.originalIndexFromPosition({
                                line: sentence.loc.start.line,
                                column: sentence.loc.start.column + (current.word_position - 1)
                            });
                            // padding positionを計算する
                            var padding = {
                                index: originalIndex
                            };
                            report(node, new RuleError("\u4E00\u6587\u306B\u4E8C\u56DE\u4EE5\u4E0A\u5229\u7528\u3055\u308C\u3066\u3044\u308B\u52A9\u8A5E \"" + joshiName + "\" \u304C\u307F\u3064\u304B\u308A\u307E\u3057\u305F\u3002", padding));
                        }
                        return current;
                    });
                });
            };
            sentences.forEach(checkSentence);
        });
    });
};

var _textlintRuleHelper = require("textlint-rule-helper");

var _kuromojin = require("kuromojin");

var _sentenceSplitter = require("sentence-splitter");

var _textlintUtilToString = require("textlint-util-to-string");

var _textlintUtilToString2 = _interopRequireDefault(_textlintUtilToString);

var _tokenUtils = require("./token-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Create token map object
 * {
 *  "で": [token, token],
 *  "の": [token, token]
 * }
 * @param tokens
 * @returns {*}
 */
function createSurfaceKeyMap(tokens) {
    // 助詞のみを対象とする
    return tokens.filter(_tokenUtils.is助詞Token).reduce(function (keyMap, token) {
        // "は:助詞.係助詞" : [token]
        var tokenKey = (0, _tokenUtils.createKeyFromKey)(token);
        if (!keyMap[tokenKey]) {
            keyMap[tokenKey] = [];
        }
        keyMap[tokenKey].push(token);
        return keyMap;
    }, {});
}
function matchExceptionRule(tokens) {
    var token = tokens[0];
    // "の" の重なりは例外
    if (token.pos_detail_1 === "連体化") {
        return true;
    }
    // "を" の重なりは例外
    if (token.pos_detail_1 === "格助詞" && token.surface_form === "を") {
        return true;
    }
    // 接続助詞 "て" の重なりは例外
    if (token.pos_detail_1 === "接続助詞" && token.surface_form === "て") {
        return true;
    }
    return false;
}
/*
 default options
 */
var defaultOptions = {
    min_interval: 1,
    strict: false,
    allow: [],
    charRegExp: /[。\?\!？！]/
};

/*
 1. Paragraph Node -> text
 2. text -> sentences
 3. tokenize sentence
 4. report error if found word that match the rule.

 TODO: need abstraction
 */
;
module.exports = exports["default"];
//# sourceMappingURL=no-doubled-joshi.js.map