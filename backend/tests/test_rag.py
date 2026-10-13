import pytest
from app.services.rag_service import rag_service
from app.services.ai_service import (
    ai_service,
    sanitize_category,
    sanitize_priority,
)
from app.models.ticket import TicketCategory, TicketPriority


def test_rag_knowledge_base_initialized():
    """Verify that knowledge base articles were parsed and indexed into vector store."""
    assert rag_service.is_initialized is True
    assert rag_service.vector_store is not None


def test_rag_vpn_retrieval_and_citations():
    """Query about VPN connection drops should retrieve VPN guide and return citations."""
    title = "VPN drops every 5 minutes"
    desc = "My WireGuard client fails with handshake timeout on home Wi-Fi"
    query = f"{title} {desc}"

    is_relevant, docs, citations = rag_service.search_relevant_context(query)

    assert is_relevant is True
    assert len(docs) > 0
    assert len(citations) > 0

    # Primary citation must reference the VPN guide
    vpn_citations = [c for c in citations if "VPN" in c["title"]]
    assert len(vpn_citations) > 0
    assert vpn_citations[0]["source"] == "vpn_setup.md"
    assert "VPN" in vpn_citations[0]["title"]


def test_rag_irrelevant_query_guardrail():
    """Irrelevant query must NOT hallucinate and should trigger the guardrail fallback."""
    title = "What is the recipe for baking chocolate cookies on Mars?"
    desc = "Need the oven temperature and flour ratio for space cookies."

    draft_reply, citations = ai_service.generate_rag_reply(title, desc)

    # 1. No citations should be returned
    assert citations == []

    # 2. Draft reply must explicitly state that no KB article was found
    assert "could not find relevant documentation in our internal knowledge base" in draft_reply.lower()


def test_ai_classification_categories():
    """Verify category classification and confidence scoring across departments."""
    # IT ticket
    it_res = ai_service.classify_ticket(
        "WireGuard VPN disconnects",
        "Connection resets after 5 minutes"
    )
    assert it_res["category"] == TicketCategory.IT
    assert it_res["priority"] == TicketPriority.HIGH
    assert 0.0 <= it_res["confidence"] <= 1.0

    # HR ticket
    hr_res = ai_service.classify_ticket(
        "Annual Leave Application",
        "Need to request 3 days of PTO in BambooHR for vacation"
    )
    assert hr_res["category"] == TicketCategory.HR
    assert hr_res["priority"] in [TicketPriority.LOW, TicketPriority.MEDIUM]

    # Finance ticket
    fin_res = ai_service.classify_ticket(
        "Expense report for monitor",
        "Submitting reimbursement claim for $250 home office equipment in Expensify"
    )
    assert fin_res["category"] == TicketCategory.FINANCE


def test_sanitization_guardrails():
    """Verify that fuzzy or invalid LLM output is cleanly sanitized to allowed enums."""
    # Categories
    assert sanitize_category("Information Technology") == TicketCategory.IT
    assert sanitize_category("HUMAN RESOURCES") == TicketCategory.HR
    assert sanitize_category("accounting") == TicketCategory.FINANCE
    assert sanitize_category("RandomHallucinatedCategory") == TicketCategory.OTHER
    assert sanitize_category(None) == TicketCategory.OTHER

    # Priorities
    assert sanitize_priority("Critical Blocker") == TicketPriority.HIGH
    assert sanitize_priority("urgent") == TicketPriority.HIGH
    assert sanitize_priority("moderate") == TicketPriority.MEDIUM
    assert sanitize_priority("minor") == TicketPriority.LOW
    assert sanitize_priority("MadeUpPriority") == TicketPriority.MEDIUM
    assert sanitize_priority(None) == TicketPriority.MEDIUM
