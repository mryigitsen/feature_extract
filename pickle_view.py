import pickle
import sys
import torch
import numpy
if __name__ == '__main__':
    argv = sys.argv
    if len(argv) <= 1:
        print('Specify pickle file as parameter.')
    else:
        print(pickle.load(open(argv[1], 'rb')))
