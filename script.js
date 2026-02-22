// Função principal responsável por lidar com a interação do usuário
// e preparar os resultados. Nenhum código é enviado a servidores
// externos; toda a análise é feita localmente no navegador.

document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyze-btn');
  analyzeBtn.addEventListener('click', analyzeCode);
});

/**
 * Lê o conteúdo do textarea, aciona as funções auxiliares e
 * atualiza a interface com os resultados. Exibe um alerta se o
 * campo estiver vazio.
 */
function analyzeCode() {
  const code = document.getElementById('code-input').value;
  if (!code.trim()) {
    alert('Por favor, insira um trecho de código para analisar.');
    return;
  }
  // Exibir o código original
  document.getElementById('original-code').textContent = code;

  // Gerar os resultados
  const explanation = generateExplanation(code);
  const suggestion = generateSuggestion(code);
  const documentation = generateDocumentation(code);

  // Atualizar a interface
  document.getElementById('explanation').textContent = explanation;
  document.getElementById('suggestion').textContent = suggestion;
  document.getElementById('documentation').textContent = documentation;
  document.getElementById('output-section').classList.remove('hidden');
}

/**
 * Gera uma explicação resumida do código fornecido. A estratégia é
 * identificar definições de função em linguagens populares (Python e
 * JavaScript) e listar seus nomes e parâmetros. Se nenhuma função
 * for encontrada, é retornada uma mensagem genérica.
 *
 * @param {string} code Texto do código a ser analisado.
 * @returns {string} Explicação gerada.
 */
function generateExplanation(code) {
  const functions = [];
  // Regex para funções Python: def nome(parâmetros):
  const pyFuncRegex = /def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;
  let match;
  while ((match = pyFuncRegex.exec(code)) !== null) {
    const name = match[1];
    const params = match[2].trim();
    functions.push({ language: 'Python', name, params });
  }
  // Regex para funções JavaScript tradicionais: function nome(parâmetros)
  const jsFuncRegex = /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;
  while ((match = jsFuncRegex.exec(code)) !== null) {
    const name = match[1];
    const params = match[2].trim();
    functions.push({ language: 'JavaScript', name, params });
  }
  // Regex para arrow functions atribuídas a variáveis: const foo = (a, b) =>
  const arrowFuncRegex = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(([^)]*)\)\s*=>/g;
  while ((match = arrowFuncRegex.exec(code)) !== null) {
    const name = match[1];
    const params = match[2].trim();
    functions.push({ language: 'JavaScript', name, params });
  }
  if (functions.length === 0) {
    // Caso não haja funções, produzir explicação genérica
    const lines = code.split(/\r?\n/).filter((l) => l.trim() !== '');
    return `O código possui ${lines.length} linha(s). Considere adicionar funções
para organizar melhor a lógica e facilitar a manutenção.`;
  }
  // Construir uma explicação listando todas as funções identificadas
  const parts = functions.map((f) => {
    const paramsText = f.params ? f.params : 'sem parâmetros';
    return `${f.language}: função ${f.name}(${paramsText})`;
  });
  return `Foram identificada(s) ${functions.length} função(ões): ${parts.join('; ')}.`;
}

/**
 * Sugere melhorias genéricas com base na presença de certas
 * características no código. A função verifica se há trechos
 * específicos, como falta de docstrings (em Python) ou uso de
 * variáveis não declaradas (em JavaScript), e recomenda boas práticas.
 * Se nenhuma heurística específica se aplicar, retornam‑se sugestões
 * gerais.
 *
 * @param {string} code Texto do código a ser analisado.
 * @returns {string} Texto com sugestões de melhoria.
 */
function generateSuggestion(code) {
  const suggestions = [];
  // Heurística: falta de docstring em Python (primeira linha após def)
  const pyFuncs = [...code.matchAll(/def\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*:\s*(?:\n\s*)+(?!\"\"\")/g)];
  if (pyFuncs.length > 0) {
    suggestions.push(
      'Adicione docstrings às suas funções em Python para explicar o propósito e os parâmetros.'
    );
  }
  // Heurística: presença de variáveis sem declaração em JS
  const undeclaredJS = [...code.matchAll(/^[ \t]*([A-Za-z_][A-Za-z0-9_]*)\s*=.+$/gm)].filter(
    (m) => {
      const line = m[0];
      return !/(const|let|var)\s+/.test(line);
    }
  );
  if (undeclaredJS.length > 0) {
    suggestions.push(
      'No JavaScript, declare variáveis usando const ou let para evitar problemas de escopo.'
    );
  }
  // Heurística: funções longas em Python (mais de 20 linhas)
  const longFuncs = [...code.matchAll(/def\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\):\s*([\s\S]*?)\n(?=def |$)/g)].filter(
    (m) => m[1].split(/\r?\n/).length > 20
  );
  if (longFuncs.length > 0) {
    suggestions.push(
      'Considere dividir funções muito longas em funções menores para melhorar a legibilidade.'
    );
  }
  // Se não houver sugestões específicas, adicione sugestões gerais
  if (suggestions.length === 0) {
    suggestions.push(
      'Use nomes de variáveis e funções descritivos e adicione comentários quando necessário.'
    );
    suggestions.push('Implemente tratamento de erros para tornar o código mais robusto.');
  }
  return suggestions.join(' ');
}

/**
 * Gera uma documentação básica a partir do código. Para cada função
 * identificada são criadas anotações com o nome da função, a lista de
 * parâmetros e um campo para a descrição e o valor retornado. Caso não
 * haja funções, a documentação sugere um título genérico.
 *
 * @param {string} code Texto do código a ser analisado.
 * @returns {string} Texto com documentação formatada.
 */
function generateDocumentation(code) {
  const docLines = [];
  const functions = [];
  // Combinação de expressões regulares para funções Python e JS
  const pyRegex = /def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;
  let match;
  while ((match = pyRegex.exec(code)) !== null) {
    functions.push({ name: match[1], params: match[2].trim() });
  }
  const jsRegex = /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;
  while ((match = jsRegex.exec(code)) !== null) {
    functions.push({ name: match[1], params: match[2].trim() });
  }
  const arrowRegex = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(([^)]*)\)\s*=>/g;
  while ((match = arrowRegex.exec(code)) !== null) {
    functions.push({ name: match[1], params: match[2].trim() });
  }
  if (functions.length === 0) {
    docLines.push('# Documentação do Código');
    docLines.push('Este trecho de código não contém definições de funções.');
    docLines.push('Use seções e comentários para documentar a lógica.');
  } else {
    functions.forEach((fn) => {
      const params = fn.params ? fn.params.split(',').map((p) => p.trim()) : [];
      docLines.push(`### Função \`${fn.name}()\``);
      docLines.push('**Descrição:** descreva aqui o que a função faz.');
      if (params.length > 0 && !(params.length === 1 && params[0] === '')) {
        docLines.push('**Parâmetros:**');
        params.forEach((param) => {
          docLines.push(`- \`${param}\`: descrição do parâmetro.`);
        });
      } else {
        docLines.push('**Parâmetros:** Esta função não recebe parâmetros.');
      }
      docLines.push('**Retorno:** descreva aqui o valor retornado pela função.');
      docLines.push('');
    });
  }
  return docLines.join('\n');
}