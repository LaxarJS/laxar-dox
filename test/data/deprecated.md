
# <a id="deprecated"></a>deprecated

Tests for the deprecation tag

## Contents

**Module Members**

- [a()](#a)
- [b() **(Deprecated)**](#b)
- [X](#X)
- [Y **(Deprecated)**](#Y)

**Types**

- [MyType **(Deprecated)**](#MyType)
- [MyValidType](#MyValidType)
  - [MyValidType.dontUse() **(Deprecated)**](#MyValidType.dontUse)

## Module Members

#### <a id="a"></a>a( x )

This function does new stuff

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| x | `Number` |  just a parameter |

#### <a id="b"></a>b( x )

**Deprecated:**

> There is a better way to do this, namely [`#a()`](#a)

This function does old stuff

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| x | `Number` |  just a parameter |

#### <a id="X"></a>X `Number`

Just a number

#### <a id="Y"></a>Y `Number`

**Deprecated:**

> Please use [`#X`](#X) instead

Just an old number

## Types

### <a id="MyType"></a>MyType

**Deprecated:**

> Don't use. There is no alternative

Very important type

### <a id="MyValidType"></a>MyValidType

Still valid type

#### <a id="MyValidType.dontUse"></a>MyValidType.dontUse()

**Deprecated:**

> Don't use. There is no alternative. Really!

Let's the rectangle grow by one pixel into each direction. The new coordinates are returned.

##### Returns

| Type | Description |
| ---- | ----------- |
| `String` |  an empty string |
