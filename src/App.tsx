import React, { useState, useEffect, useRef } from 'react';
import { Calculator, ChevronRight, Trash2 } from 'lucide-react';
import functionPlot from 'function-plot';
import { create, all } from 'mathjs';

const math = create(all);

interface Constraint {
  a: number;
  b: number;
  sign: string;
  value: number;
}

interface Solution {
  point: number[] | null;
  value: number;
  message: string;
}

function App() {
  const [objective, setObjective] = useState({ a: 1, b: 1, type: 'max' });
  const [constraints, setConstraints] = useState<Constraint[]>([
    { a: 1, b: 1, sign: '<=', value: 10 }
  ]);
  const [solution, setSolution] = useState<Solution | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const addConstraint = () => {
    setConstraints([...constraints, { a: 1, b: 1, sign: '<=', value: 10 }]);
  };

  const removeConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index));
  };

  const updateConstraint = (index: number, field: keyof Constraint, value: any) => {
    const newConstraints = [...constraints];
    newConstraints[index] = { ...newConstraints[index], [field]: value };
    setConstraints(newConstraints);
  };

  const solve = () => {
    const vertices = findVertices();
    if (!vertices.length) {
      setSolution({ point: null, value: 0, message: 'No solution exists' });
      return;
    }

    let bestValue = objective.type === 'max' ? -Infinity : Infinity;
    let bestPoint = null;

    vertices.forEach(point => {
      const value = objective.a * point[0] + objective.b * point[1];
      if (objective.type === 'max' && value > bestValue) {
        bestValue = value;
        bestPoint = point;
      } else if (objective.type === 'min' && value < bestValue) {
        bestValue = value;
        bestPoint = point;
      }
    });

    setSolution({
      point: bestPoint,
      value: bestValue,
      message: `Optimal solution found at (${bestPoint?.[0].toFixed(2)}, ${bestPoint?.[1].toFixed(2)}) with value ${bestValue.toFixed(2)}`
    });
  };

  const findVertices = () => {
    const points: number[][] = [];
    points.push([0, 0]); // Origin is always a candidate

    // Find intersections between constraints
    for (let i = 0; i < constraints.length; i++) {
      for (let j = i + 1; j < constraints.length; j++) {
        const intersection = findIntersection(constraints[i], constraints[j]);
        if (intersection && isValidPoint(intersection)) {
          points.push(intersection);
        }
      }

      // Find intersections with axes
      const xIntersect = findAxisIntersection(constraints[i], 'x');
      const yIntersect = findAxisIntersection(constraints[i], 'y');
      if (xIntersect && isValidPoint(xIntersect)) points.push(xIntersect);
      if (yIntersect && isValidPoint(yIntersect)) points.push(yIntersect);
    }

    return points.filter(point => isValidPoint(point));
  };

  const findAxisIntersection = (c: Constraint, axis: 'x' | 'y'): number[] | null => {
    if (axis === 'x') {
      if (c.b === 0) return null;
      const y = c.value / c.b;
      return [0, y];
    } else {
      if (c.a === 0) return null;
      const x = c.value / c.a;
      return [x, 0];
    }
  };

  const findIntersection = (c1: Constraint, c2: Constraint) => {
    const det = c1.a * c2.b - c2.a * c1.b;
    if (det === 0) return null;

    const x = (c1.value * c2.b - c2.value * c1.b) / det;
    const y = (c1.a * c2.value - c2.a * c1.value) / det;
    return [x, y];
  };

  const isValidPoint = (point: number[]) => {
    if (!point || point.some(coord => coord < 0)) return false;
    return constraints.every(c => {
      const value = c.a * point[0] + c.b * point[1];
      return c.sign === '<=' ? value <= c.value : value >= c.value;
    });
  };

  useEffect(() => {
    if (!plotRef.current) return;

    const width = plotRef.current.clientWidth;
    const height = 400;

    const data: any[] = [
      // Constraints lines
      ...constraints.map(c => ({
        fn: `${c.value/c.b} - (${c.a}/${c.b}) * x`,
        color: '#2563eb',
        skipTip: true
      })),
      // Objective function line
      {
        fn: `${-objective.a/objective.b} * x`,
        color: '#10b981',
        skipTip: true,
        attr: {
          'stroke-dasharray': '5,5'
        }
      }
    ];

    // Add solution point if exists
    if (solution?.point) {
      data.push({
        points: [[solution.point[0], solution.point[1]]],
        fnType: 'points',
        color: '#ef4444',
        graphType: 'scatter',
        attr: {
          r: 5
        }
      });
    }

    try {
      functionPlot({
        target: plotRef.current,
        width,
        height,
        grid: true,
        xAxis: { domain: [0, 20] },
        yAxis: { domain: [0, 20] },
        data,
        annotations: solution?.point ? [{
          x: solution.point[0],
          text: `(${solution.point[0].toFixed(2)}, ${solution.point[1].toFixed(2)})`
        }] : []
      });
    } catch (e) {
      console.error('Error plotting:', e);
    }
  }, [constraints, solution, objective]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Calculator className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Solucionador de Programación Lineal</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Función Objetivo</h2>
            <div className="flex items-center gap-4 mb-8">
              <select
                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                value={objective.type}
                onChange={(e) => setObjective({ ...objective, type: e.target.value })}
              >
                <option value="max">Maximizar</option>
                <option value="min">Minimizar</option>
              </select>
              <input
                type="number"
                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 w-20"
                value={objective.a}
                onChange={(e) => setObjective({ ...objective, a: parseFloat(e.target.value) })}
              />
              <span>x +</span>
              <input
                type="number"
                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 w-20"
                value={objective.b}
                onChange={(e) => setObjective({ ...objective, b: parseFloat(e.target.value) })}
              />
              <span>y</span>
            </div>

            <h2 className="text-xl font-semibold mb-6">Restricciones</h2>
            {constraints.map((constraint, index) => (
              <div key={index} className="flex items-center gap-4 mb-4">
                <input
                  type="number"
                  className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 w-20"
                  value={constraint.a}
                  onChange={(e) => updateConstraint(index, 'a', parseFloat(e.target.value))}
                />
                <span>x +</span>
                <input
                  type="number"
                  className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 w-20"
                  value={constraint.b}
                  onChange={(e) => updateConstraint(index, 'b', parseFloat(e.target.value))}
                />
                <span>y</span>
                <select
                  className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                  value={constraint.sign}
                  onChange={(e) => updateConstraint(index, 'sign', e.target.value)}
                >
                  <option value="<=">≤</option>
                  <option value=">=">≥</option>
                  <option value="=">=</option>
                </select>
                <input
                  type="number"
                  className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 w-20"
                  value={constraint.value}
                  onChange={(e) => updateConstraint(index, 'value', parseFloat(e.target.value))}
                />
                <button
                  onClick={() => removeConstraint(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}

            <button
              onClick={addConstraint}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              <ChevronRight className="w-5 h-5" />
              Agregar restricción
            </button>

            <button
              onClick={solve}
              className="mt-8 w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors"
            >
              Resolver
            </button>

            {solution && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-900">{solution.message}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Visualización</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
                Líneas de restricción
              </p>
              <p className="text-sm text-gray-600">
                <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full mr-2"></span>
                Función objetivo
              </p>
              <p className="text-sm text-gray-600">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Punto óptimo
              </p>
            </div>
            <div ref={plotRef} className="w-full h-[400px]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;