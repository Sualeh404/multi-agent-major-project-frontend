# Golden Set for Testing RAGAS Evaluation

## Computer Science (5 queries)
1. **Query**: "Compare RLHF and SFT in LLM post-training"
   - **Expected Papers**: 5 papers on RLHF vs SFT
   - Ouyang et al. 2022 (InstructGPT)
   - Christiano et al. 2017 (RLHF original)
   - Rafailov et al. 2023 (DPO)
   - **Ground Truth**: RLHF uses reward model, SFT directly optimizes on demonstrations

2. **Query**: "Transformer architecture evolution: BERT vs GPT comparison"
   - **Expected Papers**: 5 papers on transformer variants
   - **Ground Truth**: BERT bidirectional, GPT autoregressive

3. **Query**: "Attention mechanism in transformer models"
   - **Expected Papers**: 5 papers on attention mechanisms
   - **Ground Truth**: Q, K, V matrices, scaled dot-product

4. **Query**: "LoRA and parameter-efficient fine-tuning methods"
   - **Expected Papers**: 5 papers on PEFT
   - **Ground Truth**: Low-rank adaptation, frozen base model

5. **Query**: "Hallucination mitigation in large language models"
   - **Expected Papers**: 5 papers on hallucination
   - **Ground Truth**: RAG, fact-checking, uncertainty quantification

## Mathematics (5 queries)
6. **Query**: "Gradient descent optimization algorithms comparison"
   - **Expected Papers**: 5 papers on SGD, Adam, RMSProp
   - **Ground Truth**: Adam uses momentum + adaptive learning rates

7. **Query**: "Convolutional neural networks architecture design"
   - **Expected Papers**: 5 papers on CNNs (LeNet, AlexNet, VGG)
   - **Ground Truth**: Convolution layers, pooling, ReLU activations

8. **Query**: "Backpropagation algorithm derivation"
   - **Expected Papers**: 5 papers on backprop
   - **Ground Truth**: Chain rule, partial derivatives

9. **Query**: "Batch normalization in deep learning"
   - **Expected Papers**: 5 papers on normalization
   - **Ground Truth**: Reduces internal covariate shift

10. **Query**: "Reinforcement learning Q-learning vs policy gradients"
    - **Expected Papers**: 5 papers on RL algorithms
    - **Ground Truth**: Q-learning off-policy, policy gradients on-policy

## Physics (5 queries)
11. **Query**: "Quantum error correction codes surface codes"
    - **Expected Papers**: 5 papers on quantum error correction
    - **Ground Truth**: Topological protection, stabilizer measurements

12. **Query**: "Black hole information paradox recent developments"
    - **Expected Papers**: 5 papers on black hole physics
    - **Ground Truth**: Hawking radiation, firewall paradox

13. **Query**: "Superconductivity BCS theory explanation"
    - **Expected Papers**: 5 papers on superconductivity
    - **Ground Truth**: Cooper pairs, phonon-mediated attraction

14. **Query**: "Dark matter detection methods comparison"
    - **Expected Papers**: 5 papers on dark matter
    - **Ground Truth**: Direct detection, indirect detection, production at colliders

15. **Query**: "Gravitational waves detection LIGO analysis"
    - **Expected Papers**: 5 papers on gravitational waves
    - **Ground Truth**: Interferometry, strain sensitivity

## Biology (5 queries)
16. **Query**: "CRISPR-Cas9 gene editing mechanisms"
    - **Expected Papers**: 5 papers on CRISPR
    - **Ground Truth**: RNA-guided DNA cleavage, PAM sequence

17. **Query**: "Protein folding prediction AlphaFold approach"
    - **Expected Papers**: 5 papers on protein folding
    - **Ground Truth**: Attention on amino acid pairs, multiple sequence alignment

18. **Query**: "mRNA vaccine development COVID-19"
    - **Expected Papers**: 5 papers on mRNA vaccines
    - **Ground Truth**: Lipid nanoparticles, nucleoside-modified mRNA

19. **Query**: "Single-cell RNA sequencing technologies comparison"
    - **Expected Papers**: 5 papers on scRNA-seq
    - **Ground Truth**: Droplet-based, plate-based, spatial transcriptomics

20. **Query**: "Alzheimer's disease amyloid beta hypothesis"
    - **Expected Papers**: 5 papers on Alzheimer's
    - **Ground Truth**: Amyloid plaques, tau tangles, neurodegeneration

## Usage Instructions
Run each query through the system and manually verify:
1. Faithfulness: Are claims supported by source chunks?
2. NDCG: Are the top 5 papers relevant?
3. Latency: Is it under 60 seconds?
4. Cost: Is it under ₹10 per query?
5. RAGAS Score: Is faithfulness >= 0.92?
