function meanEmbedding(embeddings) {
    const n = embeddings.length;
    const dim = embeddings[0].length;

    const mean = new Array(dim).fill(0);

    for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
        mean[i] += emb[i];
    }
    }

    for (let i = 0; i < dim; i++) {
    mean[i] /= n;
    }

    return mean;
}

function normalize(vec) {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return vec;
    return vec.map(v => v / norm);
}

export default {
    meanEmbedding,
    normalize
};