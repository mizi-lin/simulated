/**
 * 将 url path 转为 正则表达式
 *
 * 修改自path-to-regexp  https://github.com/pillarjs/path-to-regexp
 *
 * 主要修改点
 * 1. 缩小 '*, +' 的匹配范围 ( 到结尾 或 第一次出现反斜杠的位置 )
 * 2. 添加 '**, ++', 取代原来 '*, +' 的匹配范围
 * 3. 添加方法, 直接返回正则字符串
 */

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
    // Match already escaped characters that would otherwise incorrectly appear
    // in future matches. This allows the user to escape special characters that
    // shouldn't be transformed.
    '(\\\\.)',
    // Match Express-style parameters and un-named parameters with a prefix
    // and optional suffixes. Matches appear as:
    //
    // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?"]
    // "/route(\\d+)" => [undefined, undefined, undefined, "\d+", undefined]

    //'([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))([+*?])?',

    // @modify suport '** or ++'  by mizi.20160203
    '([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))(\\+{1,2}|\\*{1,2}|\\?)?',

    // Match regexp special characters that should always be escaped.
    '([.+*?=^!:${}()[\\]|\\/])'
].join('|'), 'g');

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup(group) {
    return group.replace(/([=!:$\/()])/g, '\\$1');
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
var attachKeys = function (re, keys) {

    re.keys = keys;

    return re;
};

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array should be passed in, which will contain the placeholder key
 * names. For example `/user/:id` will then contain `["id"]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 keys
 * @param  {Object}                options
 * @return {RegExp}
 */

function pathtoRegexp(path, keys, options) {
    if (keys && !Array.isArray(keys)) {
        options = keys;
        keys = null;
    }

    keys = keys || [];
    options = options || {};

    var strict = options.strict;
    var end = options.end !== false;
    var flags = options.sensitive ? '' : 'i';
    var index = 0;

    // 基于 simulated 或 其他场景, path is reg || array 场景不太需要
    // 先注掉 @mizi.20160203
    //if (path instanceof RegExp) {
    //    // Match all capturing groups of a regexp.
    //    var groups = path.source.match(/\((?!\?)/g) || [];
    //
    //    console.debug(groups);
    //
    //    // Map all the matches to their numeric keys and push into the keys.
    //    keys.push.apply(keys, groups.map(function (match, index) {
    //        return {
    //            name: index,
    //            delimiter: null,
    //            optional: false,
    //            repeat: false
    //        };
    //    }));
    //
    //    // Return the source back to the user.
    //    return attachKeys(path, keys);
    //}
    //
    //if (Array.isArray(path)) {
    //    // Map array parts into regexps and return their source. We also pass
    //    // the same keys and options instance into every generation to get
    //    // consistent matching groups before we join the sources together.
    //    path = path.map(function (value) {
    //        return pathtoRegexp(value, keys, options).source;
    //    });
    //
    //    // Generate a new regexp instance by joining all the parts together.
    //    return attachKeys(new RegExp('(?:' + path.join('|') + ')', flags), keys);
    //}


    // Alter the path string into a usable regexp.

    console.debug(PATH_REGEXP, path.match(PATH_REGEXP), path.length );

    path = path.replace(PATH_REGEXP, function (match, escaped, prefix, key, capture, group, suffix, escape) {

        console.debug( path, arguments, escape, suffix );

        // Avoiding re-escaping escaped characters.
        if (escaped) {
            return escaped;
        }

        // Escape regexp special characters.
        if (escape) {
            return '\\' + escape;
        }

        var repeat = suffix === '++' || suffix === '**';
        var signalRepeat = suffix === '+' || suffix === '*';
        //var repeat = suffix === '+' || suffix === '*';
        var optional = suffix === '?' || suffix === '**' || suffix === '*';

        keys.push({
            name: key || index++,
            delimiter: prefix || '/',
            optional: optional,
            repeat: repeat
        });

        // Escape the prefix character.
        prefix = prefix ? '\\' + prefix : '';

        // Match using the custom capturing group, or fallback to capturing
        // everything up to the next slash (or next period if the param was
        // prefixed with a period).
        capture = escapeGroup(capture || group || '[^' + (prefix || '\\/') + ']+?');

        // Allow parameters to be repeated more than once.
        if (repeat) {
            capture = capture + '(?:' + prefix + capture + ')*';
        }

        console.info('capture', capture);

        // Allow a parameter to be optional.
        if (optional) {

            console.info('optional', '(?:' + prefix + '(' + capture + '))?');

            return '(?:' + prefix + '(' + capture + '))?';
        }

        console.info('base', prefix + '(' + capture + ')');

        // Basic parameter support.
        return prefix + '(' + capture + ')';
    });

    // Check whether the path ends in a slash as it alters some match behaviour.
    var endsWithSlash = path[path.length - 1] === '/';

    // In non-strict mode we allow an optional trailing slash in the match. If
    // the path to match already ended with a slash, we need to remove it for
    // consistency. The slash is only valid at the very end of a path match, not
    // anywhere in the middle. This is important for non-ending mode, otherwise
    // "/test/" will match "/test//route".
    if (!strict) {
        path = (endsWithSlash ? path.slice(0, -2) : path) + '(?:\\/(?=$))?';
    }

    // In non-ending mode, we need prompt the capturing groups to match as much
    // as possible by using a positive lookahead for the end or next path segment.
    if (!end) {
        path += strict && endsWithSlash ? '' : '(?=\\/|$)';
    }

    console.error(new RegExp('^' + path + (end ? '$' : ''), flags));

    return attachKeys(new RegExp('^' + path + (end ? '$' : ''), flags), keys);
};
