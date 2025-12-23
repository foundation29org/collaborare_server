const { ChatOpenAI } = require("langchain/chat_models/openai");
const config = require('../config')
const insights = require('../services/insights');
const { Client } = require("langsmith")
const { LangChainTracer } = require("langchain/callbacks");
const { LLMChain } = require("langchain/chains");
const { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder } = require("langchain/prompts");

const AZURE_OPENAI_API_KEY = config.OPENAI_API_KEY;
const OPENAI_API_VERSION = config.OPENAI_API_VERSION;
const OPENAI_API_BASE = config.OPENAI_API_BASE;
const client = new Client({
  apiUrl: "https://api.smith.langchain.com",
  apiKey: config.LANGSMITH_API_KEY,
});

function createModels(projectName) {
  const tracer = new LangChainTracer({
    projectName: projectName,
    client
  });
  
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    azureOpenAIApiKey: AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: OPENAI_API_BASE,
    azureOpenAIApiDeploymentName: "gpt-4o",
    temperature: 0,
    timeout: 500000,
    callbacks: [tracer],
  });
  
  return { model };
}

// This function will be a basic conversation with documents (context)
async function generate_items_for_disease(disease){
  return new Promise(async function (resolve, reject) {
    try {
      // Create the models
      const projectName = `${config.LANGSMITH_PROJECT}`;
      let { model } = createModels(projectName);
  

      const systemMessagePrompt = SystemMessagePromptTemplate.fromTemplate(
        `You are a medical expert, based on this context from the patient.`
      );
  
      const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(
        `Make a list of ten items that are important to a patient with {disease_name}. It should be ten simple sentences that explain a problem that is important to the patient or their caregivers and that is an unmet medical need. They should be items that a drug or treatment could change. When the answer is a set of co-morbidities give the separate items.
        Return this as a valid JSON array with the top 10 most probable like "Patient-Reported Outcome Measures (PROMs)".
        Return only this JSON array of PROMs, without any other text.
        IMPORTANT: Do not use apostrophes (') in your responses. Use "patient" instead of "patient's".
        ----------------------------------------
        Example: [{{ "name": "PROM1" }}, {{ "name": "PROM2" }}, {{ "name": "PROM3" }}, {{ "name": "PROM4" }}, {{ "name": "PROM5" }}, {{ "name": "PROM6" }}, {{ "name": "PROM7" }}, {{ "name": "PROM8" }}, {{ "name": "PROM9" }}, {{ "name": "PROM10" }}]
        ----------------------------------------
        PROM List:`
      );
  
      const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);
     
      const chain = new LLMChain({
        prompt: chatPrompt,
        llm: model,
      });

      response = await chain.invoke({
        disease_name: disease,
      });
      console.log(disease)
      console.log(response);
      
      // Ensure the response is a valid JSON
      try {
        // Clean the response text - first remove markdown code blocks
        let cleanText = response.text.trim();
        // Remove markdown code blocks (```json ... ``` or ``` ... ```)
        cleanText = cleanText.replace(/^```(?:json)?\s*/gm, '').replace(/\s*```$/gm, '').trim();
        // Try to parse it to validate it's proper JSON
        JSON.parse(cleanText);
        // If no error, return the response
        response.text = cleanText;
        resolve(response);
      } catch (jsonError) {
        console.log("Error parsing JSON response:", jsonError);
        insights.error(jsonError);
        // Try to fix common JSON issues
        try {
          let fixedText = response.text
            // Remove markdown code blocks first
            .replace(/^```(?:json)?\s*/gm, '')
            .replace(/\s*```$/gm, '')
            .trim()
            .replace(/(\w)'(\w)/g, '$1\\\'$2')  // Escapar apóstrofes dentro de palabras (como patient's)
            .replace(/'/g, '"')  // Replace single quotes with double quotes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\{\{/g, '{') // Replace double opening braces with single
            .replace(/\}\}/g, '}') // Replace double closing braces with single
            .replace(/\$\{.*?\}/g, '') // Remove any template literals
            .replace(/{name:\s*([^}]*)}/g, '{"name": "$1"}') // Fix missing quotes around property names
            .replace(/{([^:]*):([^}]*)}/g, '{"$1":$2}') // Fix missing quotes around property names
            .trim();
            
          // If the text doesn't start with '[', add it
          if (!fixedText.startsWith('[')) {
            fixedText = '[' + fixedText;
          }
          
          // If the text doesn't end with ']', add it
          if (!fixedText.endsWith(']')) {
            fixedText = fixedText + ']';
          }
          
          // Try to fix any remaining issues with the JSON structure
          fixedText = fixedText
            .replace(/,\s*\]/g, ']') // Remove trailing commas
            .replace(/,\s*,/g, ',') // Remove double commas
            .replace(/\]\s*\[/g, '],[') // Fix adjacent arrays
            .replace(/"\s*"/g, '","') // Fix adjacent strings
            .replace(/}\s*{/g, '},{'); // Fix adjacent objects
            
          // Validate the fixed JSON
          let parsedJson = JSON.parse(fixedText);
          
          // Ensure each item has a "name" property
          if (Array.isArray(parsedJson)) {
            parsedJson = parsedJson.map((item, index) => {
              if (!item.hasOwnProperty('name')) {
                // If the item doesn't have a name property, add one
                return { name: `Item ${index + 1}: ${JSON.stringify(item)}` };
              }
              return item;
            });
            
            // Convert back to string
            fixedText = JSON.stringify(parsedJson);
          }
          
          // Return the fixed response
          response.text = fixedText;
          resolve(response);
        } catch (fixError) {
          console.log("Could not fix JSON response:", fixError);
          insights.error(fixError);
          resolve({
            "msg": "Error parsing model response as JSON",
            "status": 500,
            "originalText": response.text
          });
        }
      }
    } catch (error) {
      console.log("Error happened: ", error)
      insights.error(error);
      var respu = {
        "msg": error,
        "status": 500
      }
      resolve(respu);
    }
  });
}

module.exports = {
    generate_items_for_disease,
};