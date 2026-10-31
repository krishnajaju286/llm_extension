"""
Adaptive LLM Router - Request Feature Extractor
Extracts query-level structural, semantic, and constraint features for workload-aware routing.
Modular architecture allowing seamless drop-in replacement with learned classifiers.
"""
import re
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class RequestFeatures(BaseModel):
    prompt_length: int
    estimated_tokens: int
    task_category: str
    complexity_score: float = Field(..., ge=0.0, le=1.0)
    priority: str
    quality_requirement: float = Field(..., ge=0.0, le=1.0)
    latency_requirement_ms: Optional[float] = None
    cost_constraint_usd: Optional[float] = None
    syntactic_markers: Dict[str, Any] = Field(default_factory=dict)

class FeatureExtractor:
    """
    Modular Feature Extractor for LLM Requests.
    Currently employs deterministic multi-factor heuristics (syntactic depth,
    vocabulary diversity, task keywords, cognitive markers, structural complexity).
    """

    TASK_PATTERNS = {
        "Coding": [
            r"\b(def|class|function|import|return|const|let|var|public|private|void|int|float|async|await|SELECT|WHERE|FROM|docker|kubernetes|git|refactor|debug|compile|regex|algorithm|script|api|endpoint|stack|pointer)\b",
            r"```[\s\S]*?```",
            r"[{}\[\]();<>=]{3,}",
        ],
        "Reasoning": [
            r"\b(why|prove|proof|deduce|derive|step[\s-]by[\s-]step|logical|fallacy|conclude|counterexample|premise|syllogism|paradox|implication|infer|math|calculate|solve|equation|theorem)\b",
            r"\b(if\b.*\bthen\b.*\botherwise\b)",
            r"\b(hypothesize|evaluate the trade-offs|pros and cons of)\b",
        ],
        "Summarization": [
            r"\b(summarize|summary|tl;?dr|briefly explain|condense|abstract|overview|key takeaways|bullet points|in a nutshell)\b",
        ],
        "Extraction": [
            r"\b(extract|parse|pull out|convert to json|output as json|table of|entities|structured data|csv|regex extract|find all email|schema)\b",
        ],
        "Classification": [
            r"\b(classify|categorize|sentiment|label|tag|determine if|is this|which class|positive or negative|intent)\b",
        ],
        "Creative Writing": [
            r"\b(poem|story|dialogue|creative|fiction|novel|metaphor|rhyme|screenplay|lyrics|character|essay|narrative|roleplay)\b",
        ],
        "Analysis": [
            r"\b(analyze|analysis|critique|compare|benchmark|deep dive|investigate|audit|examine|dissect|root cause)\b",
        ],
    }

    @classmethod
    def extract_features(
        cls,
        prompt: str,
        sla_profile: str = "Balanced",
        priority: str = "Medium",
        max_latency_ms: Optional[float] = None,
        max_cost: Optional[float] = None
    ) -> RequestFeatures:
        clean_prompt = prompt.strip()
        prompt_len = len(clean_prompt)
        # Approximate 4 characters per token as standard LLM heuristic
        tokens = max(1, round(prompt_len / 4.0))

        # Detect task category
        category = cls._detect_category(clean_prompt)

        # Calculate complexity score (0.0 to 1.0)
        complexity, markers = cls._compute_complexity(clean_prompt, category, tokens)

        # Inferred quality requirement based on SLA profile and task complexity
        quality_req = cls._compute_quality_requirement(sla_profile, complexity, priority)

        # Inferred latency requirement if not explicitly provided
        latency_req = max_latency_ms
        if latency_req is None:
            if sla_profile == "Low Latency":
                latency_req = 1200.0
            elif sla_profile == "Cost Optimized":
                latency_req = 4000.0
            elif sla_profile == "Quality First":
                latency_req = 5000.0
            else:
                latency_req = 2500.0

        return RequestFeatures(
            prompt_length=prompt_len,
            estimated_tokens=tokens,
            task_category=category,
            complexity_score=round(complexity, 3),
            priority=priority,
            quality_requirement=round(quality_req, 3),
            latency_requirement_ms=latency_req,
            cost_constraint_usd=max_cost,
            syntactic_markers=markers
        )

    @classmethod
    def _detect_category(cls, prompt: str) -> str:
        prompt_lower = prompt.lower()
        category_scores = {cat: 0 for cat in cls.TASK_PATTERNS}

        for cat, patterns in cls.TASK_PATTERNS.items():
            for pat in patterns:
                matches = len(re.findall(pat, prompt_lower, flags=re.IGNORECASE))
                category_scores[cat] += matches * 2

        # Direct verb matches at beginning
        first_words = prompt_lower[:40]
        if any(w in first_words for w in ["write a function", "write code", "fix this code", "implement", "debug"]):
            category_scores["Coding"] += 5
        elif any(w in first_words for w in ["summarize", "summarise", "give a summary", "tldr"]):
            category_scores["Summarization"] += 5
        elif any(w in first_words for w in ["extract", "parse", "convert to json"]):
            category_scores["Extraction"] += 5
        elif any(w in first_words for w in ["why", "how does", "prove", "what is the logic", "solve"]):
            category_scores["Reasoning"] += 4
        elif any(w in first_words for w in ["analyze", "evaluate", "compare"]):
            category_scores["Analysis"] += 4

        best_cat, best_score = max(category_scores.items(), key=lambda x: x[1])
        if best_score > 0:
            return best_cat
        return "General QA"

    @classmethod
    def _compute_complexity(cls, prompt: str, category: str, tokens: int) -> tuple[float, Dict[str, Any]]:
        score = 0.20  # Base complexity

        # 1. Length factor
        length_factor = min(0.30, (tokens / 600.0) * 0.30)
        score += length_factor

        # 2. Category baseline
        cat_weights = {
            "Coding": 0.25,
            "Reasoning": 0.30,
            "Analysis": 0.22,
            "Creative Writing": 0.15,
            "Extraction": 0.12,
            "Classification": 0.08,
            "Summarization": 0.10,
            "General QA": 0.10,
        }
        score += cat_weights.get(category, 0.10)

        # 3. Structural markers (code blocks, equations, indentation, multi-constraints)
        has_code_block = "```" in prompt
        has_numbered_steps = bool(re.search(r"^\s*\d+[\.)]\s+", prompt, re.MULTILINE))
        has_math_symbols = bool(re.search(r"[∑∫√πθλ±≠≤≥≈^/\\*]{2,}", prompt))
        question_count = prompt.count("?")
        constraints_count = len(re.findall(r"\b(must|should|ensure|constraint|without|strictly|format:)\b", prompt, re.IGNORECASE))

        marker_bonus = 0.0
        if has_code_block:
            marker_bonus += 0.12
        if has_numbered_steps:
            marker_bonus += 0.08
        if has_math_symbols:
            marker_bonus += 0.10
        if question_count > 2:
            marker_bonus += 0.06
        if constraints_count > 1:
            marker_bonus += min(0.12, constraints_count * 0.04)

        score += marker_bonus

        # Normalize bounded in [0.05, 0.98]
        clamped_score = max(0.05, min(0.98, score))

        markers = {
            "has_code": has_code_block,
            "has_steps": has_numbered_steps,
            "has_math": has_math_symbols,
            "multi_constraint": constraints_count > 1,
            "token_tier": "low" if tokens < 100 else ("mid" if tokens < 400 else "high")
        }

        return clamped_score, markers

    @classmethod
    def _compute_quality_requirement(cls, sla_profile: str, complexity: float, priority: str) -> float:
        base = 0.65
        if sla_profile == "Quality First":
            base = 0.88
        elif sla_profile == "Cost Optimized":
            base = 0.55
        elif sla_profile == "Low Latency":
            base = 0.60
        elif sla_profile == "Balanced":
            base = 0.72

        # Complexity scaling: complex queries demand higher base quality
        adjusted = base + (complexity * 0.18)

        # Priority adjustment
        if priority == "Critical":
            adjusted += 0.10
        elif priority == "High":
            adjusted += 0.05
        elif priority == "Low":
            adjusted -= 0.08

        return max(0.40, min(0.98, adjusted))
