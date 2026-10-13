import json
import re
from typing import Dict, Any, Tuple, List, Optional
from app.core.config import settings
from app.models.ticket import TicketCategory, TicketPriority
from app.services.rag_service import rag_service

# Normalized mapping dictionaries for fuzzy matching & guardrails
CATEGORY_MAP = {
    "it": TicketCategory.IT,
    "information technology": TicketCategory.IT,
    "tech": TicketCategory.IT,
    "infra": TicketCategory.IT,
    "infrastructure": TicketCategory.IT,
    "network": TicketCategory.IT,
    "vpn": TicketCategory.IT,
    "hardware": TicketCategory.IT,
    "software": TicketCategory.IT,
    "hr": TicketCategory.HR,
    "human resources": TicketCategory.HR,
    "people": TicketCategory.HR,
    "leave": TicketCategory.HR,
    "pto": TicketCategory.HR,
    "vacation": TicketCategory.HR,
    "finance": TicketCategory.FINANCE,
    "accounting": TicketCategory.FINANCE,
    "billing": TicketCategory.FINANCE,
    "payroll": TicketCategory.FINANCE,
    "expense": TicketCategory.FINANCE,
    "expenses": TicketCategory.FINANCE,
    "reimbursement": TicketCategory.FINANCE,
    "admin": TicketCategory.ADMIN,
    "administration": TicketCategory.ADMIN,
    "facilities": TicketCategory.ADMIN,
    "office": TicketCategory.ADMIN,
    "security badge": TicketCategory.ADMIN,
}

PRIORITY_MAP = {
    "low": TicketPriority.LOW,
    "minor": TicketPriority.LOW,
    "medium": TicketPriority.MEDIUM,
    "normal": TicketPriority.MEDIUM,
    "moderate": TicketPriority.MEDIUM,
    "high": TicketPriority.HIGH,
    "urgent": TicketPriority.HIGH,
    "critical": TicketPriority.HIGH,
    "blocker": TicketPriority.HIGH,
}


def sanitize_category(raw_val: Any) -> str:
    """Sanitize LLM output into an exact valid TicketCategory enum."""
    if not raw_val or not isinstance(raw_val, str):
        return TicketCategory.OTHER

    cleaned = raw_val.strip().lower()
    # Check exact enum matches
    for cat in TicketCategory.ALL:
        if cleaned == cat.lower():
            return cat

    # Check fuzzy aliases
    for key, mapped in CATEGORY_MAP.items():
        if key in cleaned:
            return mapped

    return TicketCategory.OTHER


def sanitize_priority(raw_val: Any) -> str:
    """Sanitize LLM output into an exact valid TicketPriority enum."""
    if not raw_val or not isinstance(raw_val, str):
        return TicketPriority.MEDIUM

    cleaned = raw_val.strip().lower()
    for prio in TicketPriority.ALL:
        if cleaned == prio.lower():
            return prio

    for key, mapped in PRIORITY_MAP.items():
        if key in cleaned:
            return mapped

    return TicketPriority.MEDIUM


class AIService:
    """AI Service for ticket classification, confidence scoring, and grounded RAG replies."""

    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        self.hf_key = settings.HUGGINGFACE_API_KEY.strip()
        self.hf_model = settings.HUGGINGFACE_MODEL
        self.groq_key = settings.GROQ_API_KEY.strip()
        self.groq_model = settings.GROQ_MODEL

    def _call_huggingface_llm(self, prompt: str) -> Optional[str]:
        """Invoke Hugging Face Inference API."""
        if not self.hf_key:
            return None
        try:
            from huggingface_hub import InferenceClient
            client = InferenceClient(token=self.hf_key)
            messages = [{"role": "user", "content": prompt}]
            response = client.chat_completion(
                messages=messages,
                model=self.hf_model,
                max_tokens=500,
                temperature=0.2,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[!] Hugging Face API call failed, falling back: {e}")
            return None

    def _call_groq_llm(self, prompt: str) -> Optional[str]:
        """Invoke Groq API (ultra-fast free tier)."""
        if not self.groq_key:
            return None
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {self.groq_key}",
                "Content-Type": "application/json",
            }
            body = {
                "model": self.groq_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 500,
            }
            with httpx.Client(timeout=15.0) as client:
                res = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=body)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"]
            return None
        except Exception as e:
            print(f"[!] Groq API call failed, falling back: {e}")
            return None

    def classify_ticket(self, title: str, description: str) -> Dict[str, Any]:
        """
        Suggest Category, Priority, and Confidence score for a submitted ticket.
        Returns:
            {"category": str, "priority": str, "confidence": float}
        """
        text_content = f"{title}\n{description}".strip()

        # Build classification prompt
        prompt = f"""You are an internal IT Helpdesk triage classifier.
Given the ticket title and description below, classify it into:
1. Category: Exactly one of [IT, HR, Finance, Admin, Other]
2. Priority: Exactly one of [Low, Medium, High]
3. Confidence: A decimal between 0.0 and 1.0

Ticket Title: {title}
Ticket Description: {description}

Respond ONLY in valid JSON format:
{{"category": "IT", "priority": "High", "confidence": 0.95}}"""

        raw_output = None
        if self.provider == "huggingface" and self.hf_key:
            raw_output = self._call_huggingface_llm(prompt)
        elif self.provider == "groq" and self.groq_key:
            raw_output = self._call_groq_llm(prompt)

        # Parse JSON from model output if available
        if raw_output:
            try:
                # Extract JSON block using regex if wrapped in markdown
                json_match = re.search(r"\{.*?\}", raw_output, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(0))
                    category = sanitize_category(data.get("category"))
                    priority = sanitize_priority(data.get("priority"))
                    confidence = float(data.get("confidence", 0.85))
                    confidence = max(0.1, min(1.0, confidence))
                    return {
                        "category": category,
                        "priority": priority,
                        "confidence": round(confidence, 2),
                    }
            except Exception as e:
                print(f"[!] Error parsing LLM JSON output: {e}. Falling back to heuristic classifier.")

        # Deterministic Heuristic Fallback Classifier
        return self._heuristic_classify(title, description)

    def _heuristic_classify(self, title: str, description: str) -> Dict[str, Any]:
        """Deterministic NLP classification fallback for zero-downtime offline execution."""
        text = f"{title.lower()} {description.lower()}"

        # 1. Determine Category
        if any(w in text for w in ["vpn", "wireguard", "openvpn", "wifi", "laptop", "battery", "macbook", "thinkpad", "software", "license", "password", "login", "reset", "github", "slack"]):
            category = TicketCategory.IT
            confidence = 0.94
        elif any(w in text for w in ["leave", "pto", "vacation", "sick", "holiday", "maternity", "paternity", "bamboohr", "wellness"]):
            category = TicketCategory.HR
            confidence = 0.91
        elif any(w in text for w in ["finance", "drive", "expense", "reimbursement", "expensify", "receipt", "budget", "payroll", "invoice"]):
            category = TicketCategory.FINANCE
            confidence = 0.89
        elif any(w in text for w in ["desk", "office", "chair", "badge", "parking", "keycard", "visitor"]):
            category = TicketCategory.ADMIN
            confidence = 0.85
        else:
            category = TicketCategory.OTHER
            confidence = 0.70

        # 2. Determine Priority
        if any(w in text for w in [
            "cannot connect", "blocked", "drops", "disconnect", "reset", "timeout",
            "drains completely", "dead", "urgent", "broken", "critical", "outage", "emergency", "fail"
        ]):
            priority = TicketPriority.HIGH
        elif any(w in text for w in ["need access", "request", "license", "reimbursement", "question", "battery", "monitor", "claim"]):
            priority = TicketPriority.MEDIUM
        else:
            priority = TicketPriority.LOW

        return {
            "category": category,
            "priority": priority,
            "confidence": confidence,
        }

    def generate_rag_reply(self, title: str, description: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Generate grounded reply draft from knowledge base articles using LangChain retrieval.
        Returns:
            (draft_reply, citations_list)
        """
        query = f"{title} {description}"
        is_relevant, retrieved_docs, citations = rag_service.search_relevant_context(query)

        # Guardrail: If no KB article is relevant, return safe fallback statement without hallucination
        if not is_relevant or not retrieved_docs:
            draft_reply = (
                "I could not find relevant documentation in our internal knowledge base for this request. "
                "I have forwarded this ticket to our support team for specialized assistance."
            )
            return draft_reply, []

        # Combine retrieved excerpts as grounding context
        context_text = "\n\n".join([
            f"--- Article: {doc.metadata.get('title')} ---\n{doc.page_content}"
            for doc in retrieved_docs
        ])

        # Prompt for grounded RAG answer
        prompt = f"""You are QuickDesk Assistant, an internal IT and Employee Support agent.
Answer the employee's support ticket politely and accurately, grounded STRICTLY on the knowledge base excerpts below.
If the excerpts do not contain the answer, say so directly. Do not invent policies or URL links.

Knowledge Base Excerpts:
{context_text}

Employee Ticket:
Title: {title}
Description: {description}

Draft Reply:"""

        raw_reply = None
        if self.provider == "huggingface" and self.hf_key:
            raw_reply = self._call_huggingface_llm(prompt)
        elif self.provider == "groq" and self.groq_key:
            raw_reply = self._call_groq_llm(prompt)

        if raw_reply and len(raw_reply.strip()) > 20:
            return raw_reply.strip(), citations

        # Grounded Fallback Synthesis using retrieved context
        synthesized_reply = self._synthesize_grounded_reply(title, retrieved_docs)
        return synthesized_reply, citations

    def _synthesize_grounded_reply(self, title: str, docs: List[Any]) -> str:
        """Create a well-formatted grounded draft based directly on matched knowledge base articles."""
        primary_doc = docs[0]
        title_meta = primary_doc.metadata.get("title", "Internal Policy")
        content = primary_doc.page_content

        # Extract actionable lines
        lines = [line.strip() for line in content.splitlines() if line.strip() and not line.startswith("#")]
        action_summary = " ".join(lines[:4])

        reply = (
            f"Hello,\n\n"
            f"Based on our internal policy for '{title_meta}', here is the guidance to resolve your request:\n\n"
            f"{action_summary}\n\n"
            f"If you encounter further issues or require additional administrative approval, please reply to this thread."
        )
        return reply


# Singleton instance
ai_service = AIService()
