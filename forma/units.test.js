import test from "node:test";
import assert from "node:assert/strict";
import { areaUnit, formatArea, formatLength, fromMeters, inputLength, lengthUnit, toMeters } from "./units.js";

test("unit conversions preserve project values in meters", () => {
  assert.equal(fromMeters(1, "imperial"), 1 / 0.3048);
  assert.equal(toMeters(10, "imperial"), 3.048);
  assert.equal(toMeters(fromMeters(4.25, "imperial"), "imperial"), 4.25);
});

test("unit formatters label metric and imperial lengths and areas", () => {
  assert.equal(lengthUnit("metric"), "m");
  assert.equal(lengthUnit("imperial"), "ft");
  assert.equal(areaUnit("metric"), "m²");
  assert.equal(areaUnit("imperial"), "ft²");
  assert.equal(formatLength(1, "metric"), "1 m");
  assert.equal(formatLength(1, "imperial"), "3.28 ft");
  assert.equal(formatArea(1, "imperial"), "10.76 ft²");
  assert.equal(inputLength(3.048, "imperial"), "10");
});
