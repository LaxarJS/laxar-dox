
# <a id="types"></a>types

Tests for types

## Contents

**Types**

- [Pair](#Pair)
  - [Pair.add()](#Pair.add)
- [Rectangle](#Rectangle)
  - [Rectangle.grow()](#Rectangle.grow)

## Types

### <a id="Pair"></a>Pair

A class for a pair of numbers.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| a | `Number` |  first number of the pair |
| b | `Number` |  second number of the pair |

#### <a id="Pair.add"></a>Pair.add( p )

Adds another pair.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| p | [`Pair`](#Pair) |  the pair to add |

### <a id="Rectangle"></a>Rectangle

A class for a rectangle. Uses [`#Pair`](#Pair) instances to define its location and size.

##### Parameters

| Property | Type | Description |
| -------- | ---- | ----------- |
| coordinates | [`Pair`](#Pair) |  the left and bottom coordinates of the rectangle |
| size | [`Pair`](#Pair) |  the width and height of the rectangle |

#### <a id="Rectangle.grow"></a>Rectangle.grow()

Let's the rectangle grow by one pixel into each direction. The new coordinates are returned.

##### Returns

| Type | Description |
| ---- | ----------- |
| [`Pair`](#Pair) |  the new coordinates after growth |
