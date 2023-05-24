import Stack from "./Stack.js";
import arrayEach from "./arrayEach.js";
import assignValue from "./assignValue.js";
import cloneBuffer from "./cloneBuffer.js";
import copyArray from "./copyArray.js";
import copyObject from "./copyObject.js";
import cloneArrayBuffer from "./cloneArrayBuffer.js";
import cloneDataView from "./cloneDataView.js";
import cloneRegExp from "./cloneRegExp.js";
import cloneSymbol from "./cloneSymbol.js";
import cloneTypedArray from "./cloneTypedArray.js";
import copySymbols from "./copySymbols.js";
import copySymbolsIn from "./copySymbolsIn.js";
import getAllKeys from "./getAllKeys.js";
import getAllKeysIn from "./getAllKeysIn.js";
import getTag from "./getTag.js";
import initCloneObject from "./initCloneObject.js";
import isBuffer from "../isBuffer.js";
import isObject from "../isObject.js";
import isTypedArray from "../isTypedArray.js";
import keys from "../keys.js";
import keysIn from "../keysIn.js";

/** Used to compose bitmasks for cloning. */
const CLONE_DEEP_FLAG = 1;
const CLONE_FLAT_FLAG = 2;
const CLONE_SYMBOLS_FLAG = 4;

/** `Object#toString` result references. */
const argsTag = "[object Arguments]";
const arrayTag = "[object Array]";
const boolTag = "[object Boolean]";
const dateTag = "[object Date]";
const errorTag = "[object Error]";
const mapTag = "[object Map]";
const numberTag = "[object Number]";
const objectTag = "[object Object]";
const regexpTag = "[object RegExp]";
const setTag = "[object Set]";
const stringTag = "[object String]";
const symbolTag = "[object Symbol]";
const weakMapTag = "[object WeakMap]";

const arrayBufferTag = "[object ArrayBuffer]";
const dataViewTag = "[object DataView]";
const float32Tag = "[object Float32Array]";
const float64Tag = "[object Float64Array]";
const int8Tag = "[object Int8Array]";
const int16Tag = "[object Int16Array]";
const int32Tag = "[object Int32Array]";
const uint8Tag = "[object Uint8Array]";
const uint8ClampedTag = "[object Uint8ClampedArray]";
const uint16Tag = "[object Uint16Array]";
const uint32Tag = "[object Uint32Array]";

/** Used to identify `toStringTag` values supported by `clone`. */
const cloneableTags = {};
cloneableTags[argsTag] =
  cloneableTags[arrayTag] =
  cloneableTags[arrayBufferTag] =
  cloneableTags[dataViewTag] =
  cloneableTags[boolTag] =
  cloneableTags[dateTag] =
  cloneableTags[float32Tag] =
  cloneableTags[float64Tag] =
  cloneableTags[int8Tag] =
  cloneableTags[int16Tag] =
  cloneableTags[int32Tag] =
  cloneableTags[mapTag] =
  cloneableTags[numberTag] =
  cloneableTags[objectTag] =
  cloneableTags[regexpTag] =
  cloneableTags[setTag] =
  cloneableTags[stringTag] =
  cloneableTags[symbolTag] =
  cloneableTags[uint8Tag] =
  cloneableTags[uint8ClampedTag] =
  cloneableTags[uint16Tag] =
  cloneableTags[uint32Tag] =
    true;
cloneableTags[errorTag] = cloneableTags[weakMapTag] = false;

/** Used to check objects for own properties. */
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  const Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag:
      return cloneArrayBuffer(object);

    case boolTag:
    case dateTag:
      return new Ctor(+object);

    case dataViewTag:
      return cloneDataView(object, isDeep);

    case float32Tag:
    case float64Tag:
    case int8Tag:
    case int16Tag:
    case int32Tag:
    case uint8Tag:
    case uint8ClampedTag:
    case uint16Tag:
    case uint32Tag:
      return cloneTypedArray(object, isDeep);

    case mapTag:
      return new Ctor();

    case numberTag:
    case stringTag:
      return new Ctor(object);

    case regexpTag:
      return cloneRegExp(object);

    case setTag:
      return new Ctor();

    case symbolTag:
      return cloneSymbol(object);
  }
}

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  const { length } = array;
  const result = new array.constructor(length);

  // Add properties assigned by `RegExp#exec`.
  if (
    length &&
    typeof array[0] === "string" &&
    hasOwnProperty.call(array, "index")
  ) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

/**
 * The base implementation of `clone` and `cloneDeep` which tracks
 * traversed objects.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {number} bitmask The bitmask flags.
 *  1 - Deep clone
 *  2 - Flatten inherited properties
 *  4 - Clone symbols
 * @param {Function} [customizer] The function to customize cloning.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The parent object of `value`.
 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, bitmask, customizer, key, object, stack) {
  // 克隆结果
  let result;
  // 是否深度克隆
  const isDeep = bitmask & CLONE_DEEP_FLAG;
  // 是否进行扁平化克隆
  const isFlat = bitmask & CLONE_FLAT_FLAG;
  // 是否克隆符号属性
  const isFull = bitmask & CLONE_SYMBOLS_FLAG;

  // * 自定义克隆操作
  if (customizer) {
    result = object ? customizer(value, key, object, stack) : customizer(value);
  }
  // * 如果result不为undefined，则直接返回结果。
  if (result !== undefined) {
    return result;
  }
  // * 如果不是对象，则直接返回它自身，不进行克隆操作
  if (!isObject(value)) {
    return value;
  }
  // * 判断value是否为数组
  const isArr = Array.isArray(value);
  // * 使用getTag函数（toSring.call）获取值的类型标签
  // * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/toString
  const tag = getTag(value);

  // * value是数组,调用initCloneArray函数进行数组的初始化克隆
  if (isArr) {
    result = initCloneArray(value);
    // * 不需要深度克隆的话调用copyArray浅拷贝数组
    if (!isDeep) {
      return copyArray(value, result);
    }
  }

  // * 如果是函数
  else {
    const isFunc = typeof value === "function";

    // * 如果是buffer，使用cloneBuffer函数clone
    if (isBuffer(value)) {
      return cloneBuffer(value, isDeep);
    }
    // * 如果是普通对象（Object）、参数对象（Arguments），或者是一个函数且没有传入object参数
    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      // * 初始化一个新对象，并根据isFlat和isFunc决定使用initCloneObject函数进行初始化
      result = isFlat || isFunc ? {} : initCloneObject(value);
      // * 根据是否进行深度克隆决定是否使用copySymbolsIn和copyObject函数或copySymbols函数进行属性的复制
      if (!isDeep) {
        return isFlat
          ? copySymbolsIn(value, copyObject(value, keysIn(value), result))
          : copySymbols(value, Object.assign(result, value));
      }
    } else {
      // * 如果值是一个函数或者不可克隆的类型标签，则如果传入了object参数，返回原始值value，否则返回一个空对象
      if (isFunc || !cloneableTags[tag]) {
        return object ? value : {};
      }
      // * 对于其他类型的值，调用initCloneByTag函数根据标签执行初始化克隆
      result = initCloneByTag(value, tag, isDeep);
    }
  }
  // Check for circular references and return its corresponding clone.
  // * 使用栈结构处理循环引用
  // * 如果在栈中找到了当前要克隆的值，则直接返回之前克隆的结果，避免出现无限循环
  stack || (stack = new Stack());
  const stacked = stack.get(value);
  if (stacked) {
    return stacked;
  }
  stack.set(value, result);

  // * 处理Map和Set结构对键和值进行递归克隆
  if (tag == mapTag) {
    value.forEach((subValue, key) => {
      result.set(
        key,
        baseClone(subValue, bitmask, customizer, key, value, stack)
      );
    });
    return result;
  }

  if (tag == setTag) {
    value.forEach((subValue) => {
      result.add(
        baseClone(subValue, bitmask, customizer, subValue, value, stack)
      );
    });
    return result;
  }

  // * 判断值是否为类型化数组
  if (isTypedArray(value)) {
    return result;
  }

  // * 处理对象的属性复制
  const keysFunc = isFull
    ? isFlat
      ? getAllKeysIn
      : getAllKeys
    : isFlat
    ? keysIn
    : keys;

  const props = isArr ? undefined : keysFunc(value);
  // * 遍历数组
  arrayEach(props || value, (subValue, key) => {
    if (props) {
      key = subValue;
      subValue = value[key];
    }
    // Recursively populate clone (susceptible to call stack limits).
    // 递归浅拷贝
    assignValue(
      result,
      key,
      baseClone(subValue, bitmask, customizer, key, value, stack)
    );
  });
  return result;
}

export default baseClone;
