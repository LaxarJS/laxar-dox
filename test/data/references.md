
# <a id="references"></a>references

Tests for different references between types and modules

## Contents

**Types**

- [BetterPair](#BetterPair)
  - [BetterPair.subtract()](#BetterPair.subtract)
  - [BetterPair.toPair()](#BetterPair.toPair)

## Types

### <a id="BetterPair"></a>BetterPair

> extends [`Pair`](types.md#Pair)

A better [`types#Pair`](types.md#Pair), adding some convenience.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| a | `Number` |  first number of the pair |
| b | `Number` |  second number of the pair |

#### <a id="BetterPair.subtract"></a>BetterPair.subtract( p )

Subtracts the given [`types#Pair`](types.md#Pair) from this instance.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| p | [`Pair`](types.md#Pair) |  the pair to subtract |

##### Returns

| Type | Description |
| ---- | ----------- |
| [`BetterPair`](#BetterPair) |  this instance |

#### <a id="BetterPair.toPair"></a>BetterPair.toPair()

Converts into a simple [`types#Pair`](types.md#Pair). There's really no good reason to do this, except for testing
type references in `@return` tags. (Who needs [subtraction](#Pair.subtraction) at all?)

##### Returns

| Type | Description |
| ---- | ----------- |
| [`Pair`](types.md#Pair) |  the simple [`pair`](types.md#Pair) |
