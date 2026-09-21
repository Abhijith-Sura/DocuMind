"""
RAGAS Evaluation — measures RAG pipeline quality with industry-standard metrics.

METRICS EXPLAINED:
- Faithfulness: Is the answer supported by the retrieved context? (Hallucination check)
- Answer Relevancy: Does the answer actually address the question?
- Context Precision: Are the retrieved chunks relevant? (Retrieval precision)
- Context Recall: Did we retrieve all necessary information? (Retrieval recall)

These metrics are what distinguish a serious ML engineer from a tutorial copier.
"""
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import mlflow

logger = logging.getLogger(__name__)


@dataclass
class RAGASScores:
    """RAGAS evaluation scores for a single query."""
    faithfulness: Optional[float] = None
    answer_relevancy: Optional[float] = None
    context_precision: Optional[float] = None
    context_recall: Optional[float] = None

    def to_dict(self) -> Dict[str, Optional[float]]:
        return {
            "faithfulness": self.faithfulness,
            "answer_relevancy": self.answer_relevancy,
            "context_precision": self.context_precision,
            "context_recall": self.context_recall,
        }

    def average(self) -> float:
        scores = [v for v in self.to_dict().values() if v is not None]
        return sum(scores) / len(scores) if scores else 0.0


class RAGASEvaluator:
    """
    Evaluates RAG pipeline quality using RAGAS framework.
    
    RAGAS uses LLM-as-a-judge approach:
    - Sends (question, answer, context) to an LLM
    - LLM scores faithfulness, relevancy etc.
    - Returns scores between 0-1 (higher is better)
    """

    def __init__(self):
        try:
            from ragas import evaluate
            from ragas.metrics import (
                faithfulness,
                answer_relevancy,
                context_precision,
                context_recall,
            )
            self.evaluate = evaluate
            self.metrics = [faithfulness, answer_relevancy, context_precision, context_recall]
            self.available = True
            logger.info("RAGAS evaluator initialized")
        except ImportError:
            logger.warning("RAGAS not installed. Evaluation will be skipped.")
            self.available = False

    def evaluate_single(
        self,
        query: str,
        answer: str,
        contexts: List[str],
        ground_truth: Optional[str] = None,
    ) -> RAGASScores:
        """
        Evaluate a single RAG response.
        
        Args:
            query: The user's question
            answer: The LLM's generated answer
            contexts: The retrieved chunk texts used for generation
            ground_truth: Optional reference answer for context_recall metric
        """
        if not self.available:
            return RAGASScores()

        try:
            from datasets import Dataset
            from ragas.metrics import faithfulness, answer_relevancy, context_precision

            # RAGAS expects a HuggingFace Dataset format
            data = {
                "question": [query],
                "answer": [answer],
                "contexts": [contexts],
            }

            metrics_to_use = [faithfulness, answer_relevancy, context_precision]

            if ground_truth:
                from ragas.metrics import context_recall
                data["ground_truth"] = [ground_truth]
                metrics_to_use.append(context_recall)

            dataset = Dataset.from_dict(data)
            result = self.evaluate(dataset, metrics=metrics_to_use)

            scores = RAGASScores(
                faithfulness=round(float(result["faithfulness"]), 4),
                answer_relevancy=round(float(result["answer_relevancy"]), 4),
                context_precision=round(float(result["context_precision"]), 4),
                context_recall=round(float(result.get("context_recall", 0)), 4) if ground_truth else None,
            )

            logger.info(f"RAGAS scores: {scores.to_dict()}")
            return scores

        except Exception as e:
            logger.error(f"RAGAS evaluation failed: {e}")
            return RAGASScores()

    def evaluate_batch(
        self,
        eval_set: List[Dict[str, Any]],
        experiment_name: str = "rag_evaluation",
        run_name: Optional[str] = None,
    ) -> Dict[str, float]:
        """
        Evaluate a batch of queries and log results to MLflow.
        
        eval_set: List of {"query": ..., "answer": ..., "contexts": [...], "ground_truth": ...}
        Returns aggregate scores.
        """
        if not self.available or not eval_set:
            return {}

        try:
            from datasets import Dataset
            from ragas.metrics import faithfulness, answer_relevancy, context_precision

            # Build dataset
            data = {
                "question": [e["query"] for e in eval_set],
                "answer": [e["answer"] for e in eval_set],
                "contexts": [e["contexts"] for e in eval_set],
            }

            dataset = Dataset.from_dict(data)
            result = self.evaluate(dataset, metrics=[faithfulness, answer_relevancy, context_precision])

            aggregate = {
                "faithfulness_mean": round(float(result["faithfulness"]), 4),
                "answer_relevancy_mean": round(float(result["answer_relevancy"]), 4),
                "context_precision_mean": round(float(result["context_precision"]), 4),
                "total_queries": len(eval_set),
            }

            # Log to MLflow
            self._log_to_mlflow(aggregate, experiment_name, run_name)

            return aggregate

        except Exception as e:
            logger.error(f"Batch RAGAS evaluation failed: {e}")
            return {}

    def _log_to_mlflow(
        self,
        metrics: Dict[str, float],
        experiment_name: str,
        run_name: Optional[str],
    ):
        """Log evaluation metrics to MLflow for experiment tracking."""
        try:
            mlflow.set_experiment(experiment_name)
            with mlflow.start_run(run_name=run_name):
                mlflow.log_metrics(metrics)
                logger.info(f"Logged RAGAS metrics to MLflow: {metrics}")
        except Exception as e:
            logger.warning(f"MLflow logging failed: {e}")
