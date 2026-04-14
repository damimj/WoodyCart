import { parseQuantity } from './AddItemSheet'

describe('parseQuantity', () => {
  test('returns empty strings for null/undefined', () => {
    expect(parseQuantity(null)).toEqual({ value: '', unit: '' })
    expect(parseQuantity(undefined)).toEqual({ value: '', unit: '' })
    expect(parseQuantity('')).toEqual({ value: '', unit: '' })
  })

  test('parses integer quantity with a known unit', () => {
    expect(parseQuantity('2 kilos')).toEqual({ value: '2', unit: 'kilos' })
    expect(parseQuantity('3 litros')).toEqual({ value: '3', unit: 'litros' })
    expect(parseQuantity('6 latas')).toEqual({ value: '6', unit: 'latas' })
  })

  test('parses decimal quantity', () => {
    expect(parseQuantity('1.5 litros')).toEqual({ value: '1.5', unit: 'litros' })
    expect(parseQuantity('0,5 kilos')).toEqual({ value: '0,5', unit: 'kilos' })
  })

  test('parses quantity with no unit (number only)', () => {
    expect(parseQuantity('4')).toEqual({ value: '4', unit: '' })
  })

  test('returns empty unit for unknown unit strings', () => {
    // 'cajas' is not in the UNITS list
    expect(parseQuantity('2 cajas')).toEqual({ value: '2', unit: '' })
  })

  test('treats pure text with no leading number as unit only', () => {
    // No numeric prefix — the whole string becomes the unit (raw.trim())
    const result = parseQuantity('varios')
    expect(result.value).toBe('')
    expect(result.unit).toBe('varios')
  })

  test('handles extra whitespace around the value', () => {
    expect(parseQuantity('  3  kilos')).toEqual({ value: '3', unit: 'kilos' })
  })

  test('parses all known units', () => {
    const knownUnits = ['unidades', 'litros', 'ml', 'kilos', 'gramos', 'paquetes', 'latas', 'botellas', 'docenas']
    knownUnits.forEach(unit => {
      expect(parseQuantity(`1 ${unit}`).unit).toBe(unit)
    })
  })
})
