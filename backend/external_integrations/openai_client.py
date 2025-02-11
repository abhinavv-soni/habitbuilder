#!/usr/bin/env python3
"""
<Installation>:
    poetry add openai==1.61.1
</Installation>

<Usage>:
    # As CLI tool:
    - Request: python tests/openai_client_o_series.py --model o3-mini-2025-01-31 --reasoning_effort="high" --prompt "What is the capital of Germany?"
    - Response: {'model': 'o3-mini-2025-01-31', 'reply': 'The capital of Germany is Berlin.', 'reasoning': 'The capital of Germany is Berlin. This is the official city used for government and administrative functions in Germany.'}

    # As Python function:
    from openai_client_o_series import query_openai_model
    
    response = query_openai_model(
        model="o3-mini-2025-01-31",
        user_prompt="What is the capital of Germany?",
        reasoning_effort="high"
    )
</Usage>

<Supported_Models>:
    - o3-mini-2025-01-31
    - o1
</Supported_Models>

oseries_client.py - A CLI tool to interact with OpenAI O-series models with optional reasoning effort levels. 
It also provides the reasoning in the output.

Usage:
    python oseries_client.py --model <model-name> [--reasoning <low|medium|high>] [--prompt "<your question>"]

Example:
    python oseries_client.py --model o1-preview --reasoning high --prompt "Explain the theory of relativity."
Enhanced version with reasoning structure and token tracking
"""

#!/usr/bin/env python3
import os
import sys
import json
import argparse
from openai import OpenAI, AuthenticationError

def query_openai_model(model: str, user_prompt: str, reasoning_effort: str = None) -> dict:
    """
    Query OpenAI O-series models with optional reasoning effort.
    
    Args:
        model (str): Model name (e.g., o3-mini-2025-01-31, o1)
        user_prompt (str): Prompt/question to send to the model
        reasoning_effort (str, optional): Reasoning effort level ('low', 'medium', 'high')
    
    Returns:
        dict: Response containing model output with reasoning and reply
        
    Raises:
        ValueError: If API key is missing or prompt is empty
        AuthenticationError: If API authentication fails
    """
    # Validate environment
    if not (api_key := os.getenv("OPENAI_API_KEY")):
        raise ValueError("OPENAI_API_KEY environment variable not set")

    if not user_prompt.strip():
        raise ValueError("Empty prompt")

    # Configure API client
    client = OpenAI(api_key=api_key)
    
    # Prepare system message for structured response
    system_msg = """Provide responses in JSON format with:
    - "reasoning": Your step-by-step analysis
    - "reply": Final answer/solution
    Use plain text without markdown formatting."""

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_prompt}
    ]

    # API parameters
    params = {
        "model": model,
        "messages": messages,
        "response_format": {"type": "json_object"}
    }
    if reasoning_effort:
        params["reasoning_effort"] = reasoning_effort

    try:
        response = client.chat.completions.create(**params)
    except AuthenticationError:
        raise AuthenticationError("Authentication failed: Check API key")
    
    # Process response
    try:
        content = json.loads(response.choices[0].message.content)
        output = {
            "reasoning": content.get("reasoning", "No reasoning provided"),
            "reply": content.get("reply", "No answer provided"),
            "model": model
        }
    except json.JSONDecodeError:
        output = {
            "raw_response": response.choices[0].message.content,
            "error": "Invalid JSON format"
        }

    return output

def main():
    parser = argparse.ArgumentParser(description="Interact with OpenAI O-series models via API")
    parser.add_argument("--model", "-m", required=True, help="Model name (e.g., o3-mini-2025-01-31, o1)")
    parser.add_argument(
        "--reasoning_effort", 
        "-r", 
        choices=["low", "medium", "high"],
        help="Optional reasoning effort level (only for O-series reasoning models)."
    )
    parser.add_argument("--prompt", "-p", help="Prompt/question to send to the model.")
    args = parser.parse_args()

    # Get user input
    user_prompt = args.prompt or input("Enter your prompt: ")
    
    try:
        output = query_openai_model(
            model=args.model,
            user_prompt=user_prompt,
            reasoning_effort=args.reasoning_effort
        )
        print(json.dumps(output, indent=2))
    except (ValueError, AuthenticationError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
