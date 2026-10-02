/**
 * Statistical Time-Series Model: Autoregressive Ridge Regression with L2 Regularization.
 * Combines lag-1, lag-2, lag-5 prices with exponential smoothing and trend momentum.
 */

export class StatisticalTimeSeriesRegressor {
  coefficients: number[] = [];
  intercept: number = 0;
  l2Alpha: number;

  constructor(l2Alpha: number = 0.5) {
    this.l2Alpha = l2Alpha;
  }

  fit(X: number[][], y: number[]): void {
    const n = X.length;
    const p = X[0].length;

    // Center and scale
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const meanX = new Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += X[i][j];
      meanX[j] = sum / n;
    }

    // Compute (X_c^T * X_c + alpha * I) and X_c^T * y_c
    // Using Gauss-Jordan elimination on p x p matrix (p is small, ~6-8 features)
    const A: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    const b: number[] = new Array(p).fill(0);

    for (let r = 0; r < p; r++) {
      for (let c = 0; c < p; c++) {
        let sumProd = 0;
        for (let i = 0; i < n; i++) {
          sumProd += (X[i][r] - meanX[r]) * (X[i][c] - meanX[c]);
        }
        A[r][c] = sumProd + (r === c ? this.l2Alpha * n : 0);
      }

      let sumYProd = 0;
      for (let i = 0; i < n; i++) {
        sumYProd += (X[i][r] - meanX[r]) * (y[i] - meanY);
      }
      b[r] = sumYProd;
    }

    // Solve A * coeff = b using Gaussian elimination with partial pivoting
    this.coefficients = this.solveLinearSystem(A, b);

    // Compute intercept: beta_0 = meanY - sum(coeff_j * meanX_j)
    let dot = 0;
    for (let j = 0; j < p; j++) {
      dot += this.coefficients[j] * meanX[j];
    }
    this.intercept = meanY - dot;
  }

  predict(x: number[]): number {
    let result = this.intercept;
    for (let i = 0; i < x.length; i++) {
      result += this.coefficients[i] * x[i];
    }
    return result;
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = b.length;
    // Augmented matrix
    const M: number[][] = A.map((row, i) => [...row, b[i]]);

    for (let k = 0; k < n; k++) {
      // Find pivot
      let maxRow = k;
      let maxVal = Math.abs(M[k][k]);
      for (let r = k + 1; r < n; r++) {
        if (Math.abs(M[r][k]) > maxVal) {
          maxVal = Math.abs(M[r][k]);
          maxRow = r;
        }
      }

      // Swap rows
      if (maxRow !== k) {
        const tmp = M[k];
        M[k] = M[maxRow];
        M[maxRow] = tmp;
      }

      const pivot = M[k][k] || 1e-6;
      for (let j = k; j <= n; j++) {
        M[k][j] /= pivot;
      }

      for (let r = 0; r < n; r++) {
        if (r !== k) {
          const factor = M[r][k];
          for (let j = k; j <= n; j++) {
            M[r][j] -= factor * M[k][j];
          }
        }
      }
    }

    return M.map(row => row[n]);
  }
}
