.data

.text
main:
    lui  t0, 0xFF000          # t0 = base do framebuffer
    li   t1, 0x00ADD8E6        # t1 = cor atual (ceu, azul claro)

    li   t4, 0                  # t4 = offset acumulado do laco (em bytes)
    li   t6, 2304                # t6 = limite do laco (576 pixels * 4 bytes)
sky_fill:
    add  t2, t0, t4              # t2 = endereco final (base + offset)
    sw   t1, 0(t2)
    addi t4, t4, 4
    blt  t4, t6, sky_fill

    li   t1, 0x00654321        # t1 = cor atual (marrom escuro, vaso)

    # vasinho (linha 17, 7 pixels) - offsets >2047, endereco calculado em t2
    li   t3, 2228
    add  t2, t0, t3
    sw   t1, 0(t2)
    li   t3, 2232
    add  t2, t0, t3
    sw   t1, 0(t2)
    li   t3, 2236
    add  t2, t0, t3
    sw   t1, 0(t2)
    li   t3, 2240
    add  t2, t0, t3
    sw   t1, 0(t2)
    li   t3, 2244
    add  t2, t0, t3
    sw   t1, 0(t2)
    li   t3, 2248
    add  t2, t0, t3
    sw   t1, 0(t2)
    li   t3, 2252
    add  t2, t0, t3
    sw   t1, 0(t2)

    li   t1, 0x008B4513        # t1 = cor atual (marrom, miolo)

    # miolo marrom
    sw   t1, 576(t0)
    sw   t1, 572(t0)
    sw   t1, 580(t0)
    sw   t1, 696(t0)
    sw   t1, 700(t0)
    sw   t1, 704(t0)
    sw   t1, 708(t0)
    sw   t1, 712(t0)
    sw   t1, 824(t0)
    sw   t1, 828(t0)
    sw   t1, 832(t0)
    sw   t1, 836(t0)
    sw   t1, 840(t0)
    sw   t1, 952(t0)
    sw   t1, 956(t0)
    sw   t1, 960(t0)
    sw   t1, 964(t0)
    sw   t1, 968(t0)
    sw   t1, 1084(t0)
    sw   t1, 1088(t0)
    sw   t1, 1092(t0)

    li   t1, 0x00FFFF00        # t1 = cor atual (amarelo, petalas)

    # petala norte
    sw   t1, 320(t0)
    sw   t1, 192(t0)
    sw   t1, 316(t0)
    sw   t1, 324(t0)

    # petala sul
    sw   t1, 1344(t0)
    sw   t1, 1472(t0)
    sw   t1, 1340(t0)
    sw   t1, 1348(t0)

    # petala leste
    sw   t1, 848(t0)
    sw   t1, 852(t0)
    sw   t1, 720(t0)
    sw   t1, 976(t0)

    # petala oeste
    sw   t1, 816(t0)
    sw   t1, 812(t0)
    sw   t1, 688(t0)
    sw   t1, 944(t0)

    # petala nordeste
    sw   t1, 460(t0)
    sw   t1, 336(t0)
    sw   t1, 464(t0)

    # petala noroeste
    sw   t1, 436(t0)
    sw   t1, 304(t0)
    sw   t1, 432(t0)

    # petala sudeste
    sw   t1, 1228(t0)
    sw   t1, 1360(t0)
    sw   t1, 1232(t0)

    # petala sudoeste
    sw   t1, 1204(t0)
    sw   t1, 1328(t0)
    sw   t1, 1200(t0)

    li   t1, 0x00228B22        # t1 = cor atual (verde, caule/folhas)

    # caule (primeiras 4 linhas, offset dentro do limite de 12 bits)
    sw   t1, 1600(t0)
    sw   t1, 1728(t0)
    sw   t1, 1856(t0)
    sw   t1, 1984(t0)

    # caule (ultima linha antes do vaso, offset >2047, endereco calculado em t2)
    li   t3, 2112
    add  t2, t0, t3
    sw   t1, 0(t2)

    # folha esquerda
    sw   t1, 1848(t0)
    sw   t1, 1844(t0)
    sw   t1, 1976(t0)

    # folha direita
    sw   t1, 1992(t0)
    sw   t1, 1996(t0)
    sw   t1, 1864(t0)

    li   a7, 10
    ecall