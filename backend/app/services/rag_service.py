import os
import glob
from typing import List, Dict, Any, Tuple
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Path to knowledge base directory
KB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../kb"))


class RAGService:
    def __init__(self):
        self.embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        self.vector_store: FAISS = None
        self.is_initialized: bool = False
        self._initialize_knowledge_base()

    def _extract_title(self, content: str, default_filename: str) -> str:
        """Extract first # Heading from markdown content as title."""
        for line in content.splitlines():
            stripped = line.strip()
            if stripped.startswith("# "):
                return stripped[2:].strip()
        # Fallback to readable filename
        base = os.path.basename(default_filename).replace(".md", "").replace("_", " ")
        return base.title()

    def _initialize_knowledge_base(self):
        """Load and index all Markdown files from backend/app/kb into in-memory FAISS."""
        md_files = glob.glob(os.path.join(KB_DIR, "*.md"))
        if not md_files:
            print(f"[!] Warning: No markdown articles found in {KB_DIR}")
            return

        documents: List[Document] = []
        for file_path in md_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                filename = os.path.basename(file_path)
                title = self._extract_title(content, filename)

                doc = Document(
                    page_content=content,
                    metadata={
                        "source": filename,
                        "title": title,
                        "file_path": file_path,
                    }
                )
                documents.append(doc)
            except Exception as e:
                print(f"[!] Error reading KB file {file_path}: {e}")

        # Split documents into chunks for fine-grained retrieval
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=400,
            chunk_overlap=50,
            separators=["\n## ", "\n### ", "\n\n", "\n", " ", ""]
        )
        chunked_docs = text_splitter.split_documents(documents)

        # Build in-memory FAISS vector index
        self.vector_store = FAISS.from_documents(chunked_docs, self.embeddings)
        self.is_initialized = True
        print(f"[*] RAG Knowledge Base indexed: {len(documents)} articles split into {len(chunked_docs)} chunks.")

    def search_relevant_context(
        self,
        query: str,
        k: int = 3,
        distance_threshold: float = 0.88
    ) -> Tuple[bool, List[Document], List[Dict[str, Any]]]:
        """
        Search for knowledge base documents matching query.
        Returns:
            (is_relevant, retrieved_documents, formatted_citations)
        """
        if not self.is_initialized or not self.vector_store:
            return False, [], []

        # similarity_search_with_score returns (doc, distance)
        # Note: In FAISS L2/Euclidean distance, lower is closer.
        results_with_scores = self.vector_store.similarity_search_with_score(query, k=k)

        if not results_with_scores:
            return False, [], []

        best_doc, best_score = results_with_scores[0]

        # Guardrail: If best matching chunk is too distant, consider it irrelevant
        if best_score > distance_threshold:
            return False, [], []

        relevant_docs = []
        citations = []
        seen_titles = set()

        for doc, score in results_with_scores:
            if score <= distance_threshold:
                relevant_docs.append(doc)
                title = doc.metadata.get("title", doc.metadata.get("source"))
                if title not in seen_titles:
                    seen_titles.add(title)
                    # Create clean snippet for UI citation badge
                    snippet = doc.page_content.strip()
                    if len(snippet) > 180:
                        snippet = snippet[:180] + "..."
                    citations.append({
                        "title": title,
                        "source": doc.metadata.get("source"),
                        "snippet": snippet,
                        "distance": round(float(score), 4)
                    })

        is_relevant = len(relevant_docs) > 0
        return is_relevant, relevant_docs, citations


# Singleton instance
rag_service = RAGService()
