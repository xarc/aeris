.data

.text
main:
    lui  t0, 0xFF000            # t0 = base do framebuffer
    li   t1, 0x0000FF00          # t1 = cor atual (verde, chao)
    li   t4, 0                    # t4 = coluna atual (desenho do chao)

ground_loop:
    slli t4, t4, 2                 # t4 = coluna * 4 (recalculado a cada volta, ver nota abaixo)
    li   t3, 2048                  # t3 = offset da linha 16 (16*32*4)
    add  t2, t4, t3
    add  t2, t2, t0
    sw   t1, 0(t2)
    li   t3, 2176                  # t3 = offset da linha 17 (17*32*4)
    add  t2, t4, t3
    add  t2, t2, t0
    sw   t1, 0(t2)
    srli t4, t4, 2                 # desfaz o *4 pra poder incrementar a coluna
    addi t4, t4, 1
    li   t5, 32                     # t5 = limite do laco (32 colunas)
    blt  t4, t5, ground_loop

    li   t3, 1792                   # t3 = offset da linha 14
    add  s1, t0, t3                  # s1 = endereco base da linha 14 (persiste no laco da bola)
    li   t3, 1920                    # t3 = offset da linha 15
    add  s2, t0, t3                   # s2 = endereco base da linha 15 (persiste no laco da bola)

    li   t1, 0x00FF0000              # t1 = cor atual (vermelho, bola)
    li   s3, 0                        # s3 = coluna atual da bola (canto esquerdo do bloco 2x2)
    li   s4, 0                         # s4 = coluna anterior da bola

roll_loop:
    slli t4, s4, 2
    add  t2, s1, t4
    sw   x0, 0(t2)                     # apaga bloco anterior, linha 14 col
    addi t2, t2, 4
    sw   x0, 0(t2)                      # apaga linha 14 col+1
    add  t2, s2, t4
    sw   x0, 0(t2)                       # apaga linha 15 col
    addi t2, t2, 4
    sw   x0, 0(t2)                        # apaga linha 15 col+1

    slli t4, s3, 2
    add  t2, s1, t4
    sw   t1, 0(t2)                         # desenha bloco novo, linha 14 col
    addi t2, t2, 4
    sw   t1, 0(t2)                          # linha 14 col+1
    add  t2, s2, t4
    sw   t1, 0(t2)                           # linha 15 col
    addi t2, t2, 4
    sw   t1, 0(t2)                            # linha 15 col+1

    addi s4, s3, 0                             # coluna anterior = coluna atual

    li   t6, 3000                               # t6 = contador de espera (ajusta se quiser mais devagar/rapido)
wait_loop:
    addi t6, t6, -1
    blt  x0, t6, wait_loop

    addi s3, s3, 1                               # coluna atual++
    li   t5, 31                                   # t5 = limite do laco (borda do grid)
    blt  s3, t5, roll_loop                          # se ainda nao chegou na borda, continua
    li   s3, 0                                       # senao, volta pro inicio
    j    roll_loop