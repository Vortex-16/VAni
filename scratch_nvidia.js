const img = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function test() {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST', 
    headers: {
      'Authorization': 'Bearer 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', 
      'Content-Type': 'application/json'
    }, 
    body: JSON.stringify({
      model: 'nvidia/nemotron-parse', 
      messages: [{
        role: 'user', 
        content: '<img src="data:image/png;base64,' + img + '" />'
      }], 
      tools: [{type: 'function', function: {name: 'markdown_no_bbox'}}], 
      tool_choice: {type: 'function', function: {name: 'markdown_no_bbox'}}, 
      max_tokens: 100
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
