import re
import json
from typing import Any


def extract_json_from_response(response: str) -> dict:
    """
    Extract the first full JSON object from an LLM response.
    - Strips common markdown code fences.
    - Finds the first balanced { ... } block and parses it.
    Raises ValueError if no valid JSON object found.
    """
    if not response or not isinstance(response, str):
        raise ValueError("Empty or invalid response")

    s = response.strip()

    # Remove common code fence wrappers
    # ```json ... ``` or ``` ... ```
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*```$", "", s, flags=re.IGNORECASE)
    s = s.strip()

    # If response contains something like "Sure, here's the JSON:\n{...}", remove leading text before first brace.
    first_brace = s.find("{")
    if first_brace == -1:
        raise ValueError("No JSON object found in response")

    s = s[first_brace:]

    # Find balanced JSON object by counting braces
    brace_count = 0
    start = None
    for i, ch in enumerate(s):
        if ch == "{":
            if start is None:
                start = i
            brace_count += 1
        elif ch == "}":
            brace_count -= 1
            if brace_count == 0 and start is not None:
                candidate = s[start:i+1]
                # Try parsing the candidate JSON
                try:
                    parsed = json.loads(candidate)
                    if isinstance(parsed, dict):
                        return parsed
                    # If top-level is not dict, still return it wrapped
                    return parsed
                except json.JSONDecodeError:
                    # continue searching (in case of nested braces in text)
                    continue

    # Fallback: try regex greedy (less safe)
    m = re.search(r"\{[\s\S]*\}", s)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON (fallback): {e}")

    raise ValueError("Failed to extract JSON object from LLM response")
